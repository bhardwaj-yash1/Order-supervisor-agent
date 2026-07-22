from temporalio import activity
from openai import OpenAI
from backend.config import settings
from backend.database import get_sync_session
from backend.models import Run, TimelineEntry, MemorySummary
from backend.agent.classifier import classify_event
from backend.agent.runtime import run_agent, generate_final_summary
import json
from datetime import datetime, timedelta

# Create a sync OpenAI client (lazy-initialized or wrapped with dummy key)
openai_client = OpenAI(api_key=settings.GROQ_API_KEY or "dummy_key", base_url=settings.GROQ_BASE_URL)

@activity.defn
def classify_event_activity(event_type: str, event_data: dict, memory_summary: str, aggressiveness: str) -> dict:
    return classify_event(
        client=openai_client,
        model=settings.GROQ_CLASSIFIER_MODEL,
        event_type=event_type,
        event_data=event_data,
        memory_summary=memory_summary,
        aggressiveness=aggressiveness
    )

@activity.defn
def run_agent_activity(context: dict) -> dict:
    run_id = context["run_id"]
    trigger = context["trigger"]
    supervisor_config = context["supervisor_config"]
    order_context = context["order_context"]
    pending_events = context["pending_events"]
    extra_instructions = context["extra_instructions"]
    
    session = get_sync_session()
    try:
        run = session.query(Run).filter_by(id=run_id).first()
        if not run:
            return {}

        memory = session.query(MemorySummary).filter_by(run_id=run_id).first()
        memory_summary_text = memory.summary if memory else ""

        recent_entries = session.query(TimelineEntry).filter_by(run_id=run_id).order_by(TimelineEntry.timestamp.desc()).limit(10).all()
        recent_timeline = [
            {"entry_type": e.entry_type, "content": e.content, "metadata": e.metadata_json, "timestamp": e.timestamp.isoformat()}
            for e in reversed(recent_entries)
        ]

        result = run_agent(
            client=openai_client,
            model=supervisor_config.get("model_name", settings.GROQ_AGENT_MODEL),
            supervisor_config=supervisor_config,
            order_context=order_context,
            memory_summary=memory_summary_text,
            recent_timeline=recent_timeline,
            pending_events=pending_events,
            extra_instructions=extra_instructions,
            trigger=trigger,
            available_tool_names=supervisor_config.get("available_tools", [])
        )

        for pe in pending_events:
            entry = TimelineEntry(
                run_id=run_id,
                entry_type="event",
                content=f"Processed event: {pe['type']}",
                metadata_json=pe.get("data", {}),
                importance=3
            )
            session.add(entry)

        for e in result.get("timeline_entries", []):
            entry = TimelineEntry(
                run_id=run_id,
                entry_type=e["entry_type"],
                content=e["content"],
                metadata_json=e["metadata"],
                importance=e["importance"]
            )
            session.add(entry)

        if result.get("memory_update"):
            if not memory:
                memory = MemorySummary(run_id=run_id, summary=result["memory_update"], key_facts=[])
                session.add(memory)
            else:
                memory.summary = result["memory_update"]
                memory.updated_at = datetime.utcnow()

        if result.get("sleep_minutes"):
            run.sleep_until = datetime.utcnow() + timedelta(minutes=result["sleep_minutes"])

        if result.get("status_change") == "completed":
            run.status = "completed"
            run.completed_at = datetime.utcnow()

        session.commit()

        return {
            "reasoning": result.get("reasoning"),
            "memory_update": result.get("memory_update"),
            "sleep_minutes": result.get("sleep_minutes"),
            "status_change": result.get("status_change")
        }
    finally:
        session.close()

@activity.defn
def generate_final_summary_activity(run_id: str, order_context: dict) -> dict:
    session = get_sync_session()
    try:
        run = session.query(Run).filter_by(id=run_id).first()
        if not run:
            return {}

        memory = session.query(MemorySummary).filter_by(run_id=run_id).first()
        memory_summary_text = memory.summary if memory else ""

        all_entries = session.query(TimelineEntry).filter_by(run_id=run_id).order_by(TimelineEntry.timestamp).all()
        full_timeline = [
            {"entry_type": e.entry_type, "content": e.content, "timestamp": e.timestamp.isoformat()}
            for e in all_entries
        ]

        try:
            summary = generate_final_summary(
                client=openai_client,
                model=settings.GROQ_AGENT_MODEL,
                order_context=order_context,
                memory_summary=memory_summary_text,
                full_timeline=full_timeline,
                extra_instructions=[]
            )
        except Exception as e:
            summary = {"summary": f"Failed to generate summary: {str(e)}"}

        run.final_summary = summary
        if run.status != "terminated":
            run.status = "completed"
        run.completed_at = datetime.utcnow()
        session.commit()

        return summary
    finally:
        session.close()

@activity.defn
def persist_run_status_activity(run_id: str, status: str, sleep_until: datetime) -> None:
    session = get_sync_session()
    try:
        run = session.query(Run).filter_by(id=run_id).first()
        if run:
            run.status = status
            run.sleep_until = sleep_until
            session.commit()
    finally:
        session.close()
