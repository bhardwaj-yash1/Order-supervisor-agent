import json
from typing import Dict, Any, List

def build_agent_context(
    supervisor_config: Dict[str, Any],
    order_context: Dict[str, Any],
    memory_summary: str,
    recent_timeline: List[Dict[str, Any]],
    pending_events: List[Dict[str, Any]],
    extra_instructions: List[str],
    trigger: str,
    tool_definitions: List[Dict[str, Any]]
):
    system_prompt = f"""You are an intelligent Order Supervisor Agent.
Base Instruction: {supervisor_config.get('base_instruction', '')}

ORDER CONTEXT:
{json.dumps(order_context, indent=2)}

EXTRA INSTRUCTIONS:
{json.dumps(extra_instructions, indent=2)}

CURRENT MEMORY SUMMARY:
{memory_summary or 'No previous memory.'}

AVAILABLE TOOLS:
{json.dumps(tool_definitions, indent=2)}

OUTPUT FORMAT INSTRUCTIONS:
You must return a valid JSON object matching this schema:
{{
    "reasoning": "Your step-by-step reasoning",
    "tool_calls": [
        {{
            "tool": "tool_name",
            "args": {{"arg1": "value"}}
        }}
    ],
    "memory_update": "Updated memory summary combining old memory and new events",
    "sleep_minutes": 240
}}

IMPORTANT:
- `tool_calls` MUST be an array, even if empty ([]).
- If the workflow is completely finished and no further actions are needed, use the `close_workflow` tool.
- If you are waiting for more events or just resting, use the `schedule_wakeup` tool to sleep for a specified duration instead of closing.
"""
    user_prompt = f"""WAKE-UP TRIGGER: {trigger}

RECENT TIMELINE ENTRIES:
{json.dumps(recent_timeline, indent=2)}

PENDING NEW EVENTS TO PROCESS:
{json.dumps(pending_events, indent=2)}

Please determine the next actions, if any, update your memory, and provide the tool calls.
"""
    return system_prompt, user_prompt

def compact_memory(client, model: str, current_summary: str, old_entries: List[Dict[str, Any]]):
    prompt = f"""Combine the following current summary and old timeline entries into a concise memory summary.
CURRENT SUMMARY: {current_summary}
OLD ENTRIES: {json.dumps(old_entries, indent=2)}

Return a JSON object with:
{{
    "summary": "new concise summary",
    "key_facts": ["fact 1", "fact 2"]
}}
"""
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    result = json.loads(response.choices[0].message.content)
    return result.get("summary", ""), result.get("key_facts", [])
