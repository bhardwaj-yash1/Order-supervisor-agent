from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from backend.database import get_db
from backend.models import Run, Supervisor, RunInstruction
from backend.schemas import RunCreate, RunResponse, RunDetailResponse, InstructionAdd
from backend.config import settings
import uuid

router = APIRouter(prefix="/api/runs", tags=["runs"])

@router.post("", response_model=RunResponse)
async def create_run(run_in: RunCreate, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supervisor).where(Supervisor.id == run_in.supervisor_id))
    supervisor = result.scalars().first()
    if not supervisor:
        raise HTTPException(status_code=404, detail="Supervisor not found")
    
    workflow_id = f"run-{uuid.uuid4()}"
    
    db_run = Run(
        supervisor_id=run_in.supervisor_id,
        order_id=run_in.order_id,
        order_context=run_in.order_context,
        workflow_id=workflow_id
    )
    db.add(db_run)
    await db.commit()
    await db.refresh(db_run)
    
    client = request.app.state.temporal_client
    await client.start_workflow(
        "OrderSupervisorWorkflow",
        args=[{
            "run_id": db_run.id,
            "supervisor_config": {
                "base_instruction": supervisor.base_instruction,
                "available_tools": supervisor.available_tools,
                "default_wakeup_minutes": supervisor.default_wakeup_minutes,
                "wakeup_aggressiveness": supervisor.wakeup_aggressiveness,
                "model_name": supervisor.model_name
            },
            "order_context": run_in.order_context
        }],
        id=workflow_id,
        task_queue=settings.TEMPORAL_TASK_QUEUE
    )
    
    r = RunResponse.model_validate(db_run).model_dump()
    r["supervisor_name"] = supervisor.name
    return r

@router.get("", response_model=List[RunResponse])
async def list_runs(status: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(Run).options(selectinload(Run.supervisor))
    if status:
        query = query.where(Run.status == status)
    result = await db.execute(query)
    runs_out = []
    for run in result.scalars().all():
        r = RunResponse.model_validate(run).model_dump()
        r["supervisor_name"] = run.supervisor.name if run.supervisor else None
        runs_out.append(r)
    return runs_out

@router.get("/{run_id}", response_model=RunDetailResponse)
async def get_run(run_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Run).where(Run.id == run_id).options(
            selectinload(Run.timeline_entries),
            selectinload(Run.memory),
            selectinload(Run.instructions),
            selectinload(Run.supervisor)
        )
    )
    run = result.scalars().first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    r = RunDetailResponse.model_validate(run).model_dump()
    r["supervisor_name"] = run.supervisor.name if run.supervisor else None
    return r

@router.post("/{run_id}/instructions")
async def add_instruction(run_id: str, instr: InstructionAdd, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Run).where(Run.id == run_id))
    run = result.scalars().first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    db_instr = RunInstruction(run_id=run.id, instruction=instr.instruction)
    db.add(db_instr)
    await db.commit()
    
    try:
        client = request.app.state.temporal_client
        handle = client.get_workflow_handle(run.workflow_id)
        await handle.signal("on_instruction", instr.instruction)
    except Exception as e:
        # Instruction is saved to DB even if workflow signal fails
        return {"status": "saved_to_db", "warning": f"Workflow signal failed: {str(e)}"}
    return {"status": "ok"}

@router.post("/{run_id}/pause")
async def pause_run(run_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Run).where(Run.id == run_id))
    run = result.scalars().first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    try:
        client = request.app.state.temporal_client
        handle = client.get_workflow_handle(run.workflow_id)
        await handle.signal("on_pause")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to signal workflow: {str(e)}")
    
    run.status = "paused"
    await db.commit()
    return {"status": "ok"}

@router.post("/{run_id}/resume")
async def resume_run(run_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Run).where(Run.id == run_id))
    run = result.scalars().first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    try:
        client = request.app.state.temporal_client
        handle = client.get_workflow_handle(run.workflow_id)
        await handle.signal("on_resume")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to signal workflow: {str(e)}")
    
    run.status = "active"
    await db.commit()
    return {"status": "ok"}

@router.post("/{run_id}/terminate")
async def terminate_run(run_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Run).where(Run.id == run_id))
    run = result.scalars().first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    try:
        client = request.app.state.temporal_client
        handle = client.get_workflow_handle(run.workflow_id)
        await handle.signal("on_terminate")
    except Exception as e:
        # Still mark as terminated in DB even if workflow is gone
        pass
    
    run.status = "terminated"
    run.completed_at = __import__('datetime').datetime.utcnow()
    await db.commit()
    return {"status": "ok"}

