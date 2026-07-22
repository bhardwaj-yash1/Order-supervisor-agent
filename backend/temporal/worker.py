import asyncio
from temporalio.client import Client
from temporalio.worker import Worker
from backend.config import settings
from backend.temporal.workflows import OrderSupervisorWorkflow
from backend.temporal.activities import (
    classify_event_activity,
    run_agent_activity,
    generate_final_summary_activity,
    persist_run_status_activity
)

async def start_worker():
    client = await Client.connect(settings.TEMPORAL_ADDRESS)
    worker = Worker(
        client,
        task_queue=settings.TEMPORAL_TASK_QUEUE,
        workflows=[OrderSupervisorWorkflow],
        activities=[
            classify_event_activity,
            run_agent_activity,
            generate_final_summary_activity,
            persist_run_status_activity
        ]
    )
    await worker.run()

async def get_temporal_client() -> Client:
    return await Client.connect(settings.TEMPORAL_ADDRESS)
