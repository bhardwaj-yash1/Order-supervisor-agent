from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.database import get_db
from backend.models import Run, TimelineEntry
from backend.schemas import EventInject
from datetime import datetime

router = APIRouter(prefix="/api/runs", tags=["events"])

@router.post("/{run_id}/events")
async def inject_event(run_id: str, event: EventInject, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Run).where(Run.id == run_id))
    run = result.scalars().first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    if run.status not in ("active", "paused"):
        raise HTTPException(status_code=400, detail=f"Run is {run.status}, cannot inject events")
    
    # Always record the event in the timeline so it's visible in the UI
    # even if the Temporal signal fails
    timeline_entry = TimelineEntry(
        run_id=run.id,
        entry_type="event",
        content=f"Event injected: {event.type}",
        metadata_json=event.data,
        importance=3,
        timestamp=datetime.utcnow()
    )
    db.add(timeline_entry)
    await db.commit()
    
    # Try to signal the Temporal workflow
    signal_ok = False
    signal_error = None
    try:
        client = request.app.state.temporal_client
        handle = client.get_workflow_handle(run.workflow_id)
        await handle.signal("on_event", {"type": event.type, "data": event.data})
        signal_ok = True
    except Exception as e:
        signal_error = str(e)
    
    if signal_ok:
        return {"status": "ok", "message": f"Event '{event.type}' sent to workflow"}
    else:
        # Event is saved to timeline, but workflow signal failed
        # This can happen if the workflow completed between the status check and the signal
        return {
            "status": "partial",
            "message": f"Event recorded in timeline but workflow signal failed: {signal_error}"
        }
