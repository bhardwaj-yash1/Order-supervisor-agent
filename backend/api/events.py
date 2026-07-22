from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.database import get_db
from backend.models import Run
from backend.schemas import EventInject

router = APIRouter(prefix="/api/runs", tags=["events"])

@router.post("/{run_id}/events")
async def inject_event(run_id: str, event: EventInject, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Run).where(Run.id == run_id))
    run = result.scalars().first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    client = request.app.state.temporal_client
    handle = client.get_workflow_handle(run.workflow_id)
    await handle.signal("on_event", {"type": event.type, "data": event.data})
    
    return {"status": "ok"}
