from typing import Callable, Any, Dict, List

class ToolRegistry:
    def __init__(self):
        self.tools = {}

    def register(self, name: str, description: str, parameters: Dict[str, Any], execute_fn: Callable):
        self.tools[name] = {
            "name": name,
            "description": description,
            "parameters": parameters,
            "execute": execute_fn
        }

    def get_tool_definitions(self) -> List[Dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t["description"],
                    "parameters": t["parameters"]
                }
            }
            for t in self.tools.values()
        ]

    def get_tools_by_names(self, names: List[str]) -> List[Dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": {
                    "name": self.tools[n]["name"],
                    "description": self.tools[n]["description"],
                    "parameters": self.tools[n]["parameters"]
                }
            }
            for n in names if n in self.tools
        ]

    def execute_tool(self, name: str, args: Dict[str, Any]) -> str:
        if name not in self.tools:
            return f"Error: Tool {name} not found."
        try:
            return self.tools[name]["execute"](**args)
        except Exception as e:
            return f"Error executing tool {name}: {str(e)}"

registry = ToolRegistry()

registry.register(
    name="send_customer_message",
    description="Send a message to the customer.",
    parameters={
        "type": "object",
        "properties": {
            "message": {"type": "string", "description": "The message to send"}
        },
        "required": ["message"]
    },
    execute_fn=lambda message: f"Message sent to customer: {message}"
)

registry.register(
    name="create_internal_note",
    description="Create an internal note for the order.",
    parameters={
        "type": "object",
        "properties": {
            "note": {"type": "string", "description": "The note content"}
        },
        "required": ["note"]
    },
    execute_fn=lambda note: f"Internal note created: {note}"
)

registry.register(
    name="escalate_issue",
    description="Escalate an issue to human agents.",
    parameters={
        "type": "object",
        "properties": {
            "reason": {"type": "string", "description": "Reason for escalation"},
            "priority": {"type": "string", "description": "Priority level"}
        },
        "required": ["reason", "priority"]
    },
    execute_fn=lambda reason, priority: f"Issue escalated ({priority}): {reason}"
)

registry.register(
    name="mark_order_for_review",
    description="Mark the order for manual review.",
    parameters={
        "type": "object",
        "properties": {
            "reason": {"type": "string", "description": "Reason for review"}
        },
        "required": ["reason"]
    },
    execute_fn=lambda reason: f"Order flagged for review: {reason}"
)

registry.register(
    name="schedule_wakeup",
    description="Schedule a wakeup for the agent in a specified number of minutes.",
    parameters={
        "type": "object",
        "properties": {
            "minutes": {"type": "integer", "description": "Minutes until wakeup"},
            "reason": {"type": "string", "description": "Reason for the wakeup"}
        },
        "required": ["minutes", "reason"]
    },
    execute_fn=lambda minutes, reason: f"Wake-up scheduled in {minutes} minutes: {reason}"
)

registry.register(
    name="close_workflow",
    description="Close the workflow for this order.",
    parameters={
        "type": "object",
        "properties": {
            "summary": {"type": "string", "description": "Summary of the workflow closing"}
        },
        "required": ["summary"]
    },
    execute_fn=lambda summary: f"Workflow closing: {summary}"
)
