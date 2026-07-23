import asyncio
from datetime import timedelta
from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from backend.temporal.activities import (
        classify_event_activity,
        run_agent_activity,
        generate_final_summary_activity,
        persist_run_status_activity
    )

@workflow.defn
class OrderSupervisorWorkflow:
    def __init__(self):
        self.status = "active"
        self.pending_events = []
        self.extra_instructions = []
        self.should_run_agent = False
        self.wake_reason = None
        self.sleep_minutes = 240  # default
        self.run_id = None
        self.supervisor_config = None
        self.order_context = None
        self.memory_summary = ""
        self.agent_run_count = 0

    @workflow.signal
    async def on_event(self, event: dict):
        try:
            decision = await workflow.execute_activity(
                classify_event_activity,
                args=[event["type"], event.get("data", {}), self.memory_summary, 
                      self.supervisor_config.get("wakeup_aggressiveness", "medium")],
                start_to_close_timeout=timedelta(seconds=30)
            )
        except Exception:
            decision = {"should_wake": True}
        self.pending_events.append(event)
        if decision.get("should_wake", False):
            self.should_run_agent = True
            self.wake_reason = f"signal:{event['type']}"

    @workflow.signal
    async def on_instruction(self, instruction: str):
        self.extra_instructions.append(instruction)

    @workflow.signal
    async def on_pause(self):
        self.status = "paused"

    @workflow.signal
    async def on_resume(self):
        self.status = "active"
        self.should_run_agent = True
        self.wake_reason = "resumed"

    @workflow.signal
    async def on_terminate(self):
        self.status = "terminated"
        self.should_run_agent = True
        self.wake_reason = "terminate"

    @workflow.query
    def get_state(self) -> dict:
        return {
            "status": self.status,
            "pending_events_count": len(self.pending_events),
            "sleep_minutes": self.sleep_minutes,
            "agent_run_count": self.agent_run_count,
            "memory_summary": self.memory_summary
        }

    @workflow.run
    async def run(self, params: dict):
        self.run_id = params["run_id"]
        self.supervisor_config = params["supervisor_config"]
        self.order_context = params["order_context"]
        self.sleep_minutes = self.supervisor_config.get("default_wakeup_minutes", 240)

        await self._execute_agent("workflow_start")

        while self.status in ("active", "paused"):
            sleep_duration = timedelta(minutes=max(self.sleep_minutes, 1))

            await workflow.wait_condition(
                lambda: self.should_run_agent or self.status == "terminated",
                timeout=sleep_duration
            )
            
            if not self.should_run_agent and self.status not in ("terminated",):
                self.wake_reason = "scheduled_wakeup"
                self.should_run_agent = True

            if self.status == "paused":
                await workflow.wait_condition(lambda: self.status != "paused")
                if self.status == "terminated":
                    break
                continue

            if self.status == "terminated":
                break

            if self.should_run_agent:
                await self._execute_agent(self.wake_reason or "scheduled_wakeup")
                self.should_run_agent = False
                self.wake_reason = None

        if self.status == "terminated":
            await self._execute_agent("terminate")

        # Generate final summary for both completed and terminated runs
        await workflow.execute_activity(
            generate_final_summary_activity,
            args=[self.run_id, self.order_context],
            start_to_close_timeout=timedelta(seconds=120)
        )

        return {"status": self.status, "run_id": self.run_id}

    async def _execute_agent(self, trigger: str):
        result = await workflow.execute_activity(
            run_agent_activity,
            args=[{
                "run_id": self.run_id,
                "trigger": trigger,
                "supervisor_config": self.supervisor_config,
                "order_context": self.order_context,
                "pending_events": self.pending_events,
                "extra_instructions": self.extra_instructions,
            }],
            start_to_close_timeout=timedelta(seconds=120)
        )

        self.pending_events = []
        self.agent_run_count += 1

        if result.get("memory_update"):
            self.memory_summary = result["memory_update"]
        if result.get("sleep_minutes"):
            self.sleep_minutes = result["sleep_minutes"]
        if result.get("status_change") == "completed":
            self.status = "completed"

        # Persist updated status and sleep_until to database
        from datetime import datetime
        new_sleep_until = datetime.utcnow() + timedelta(minutes=max(self.sleep_minutes, 1))
        await workflow.execute_activity(
            persist_run_status_activity,
            args=[self.run_id, self.status, new_sleep_until],
            start_to_close_timeout=timedelta(seconds=30)
        )
