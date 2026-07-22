from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from backend.database import get_db
from backend.models import Supervisor
from backend.schemas import SupervisorCreate, SupervisorResponse

router = APIRouter(prefix="/api/supervisors", tags=["supervisors"])

@router.post("", response_model=SupervisorResponse, status_code=201)
async def create_supervisor(sup: SupervisorCreate, db: AsyncSession = Depends(get_db)):
    db_sup = Supervisor(
        name=sup.name,
        base_instruction=sup.base_instruction,
        available_tools=sup.available_tools,
        default_wakeup_minutes=sup.default_wakeup_minutes,
        wakeup_aggressiveness=sup.wakeup_aggressiveness,
        model_name=sup.model_name
    )
    db.add(db_sup)
    await db.commit()
    await db.refresh(db_sup)
    return db_sup

@router.get("", response_model=List[SupervisorResponse])
async def list_supervisors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supervisor))
    return result.scalars().all()

@router.get("/{supervisor_id}", response_model=SupervisorResponse)
async def get_supervisor(supervisor_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supervisor).where(Supervisor.id == supervisor_id))
    sup = result.scalars().first()
    if not sup:
        raise HTTPException(status_code=404, detail="Supervisor not found")
    return sup
