import json
from backend.agent.tools import registry

def run_agent(client, model: str, supervisor_config: dict, order_context: dict, memory_summary: str, recent_timeline: list, pending_events: list, extra_instructions: list, trigger: str, available_tool_names: list) -> dict:
    from backend.agent.memory import build_agent_context
    
    tool_definitions = registry.get_tools_by_names(available_tool_names)
    sys_prompt, user_prompt = build_agent_context(
        supervisor_config, order_context, memory_summary, recent_timeline,
        pending_events, extra_instructions, trigger, tool_definitions
    )
    
    def try_llm():
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)

    try:
        result = try_llm()
    except Exception:
        # Retry once
        try:
            result = try_llm()
        except Exception as e:
            return {
                "reasoning": f"Failed to get valid JSON from LLM: {str(e)}",
                "tool_calls": [],
                "timeline_entries": [{"entry_type": "error", "content": f"LLM Error: {str(e)}", "metadata": {}, "importance": 5}],
                "memory_update": memory_summary,
                "sleep_minutes": supervisor_config.get("default_wakeup_minutes", 240),
                "status_change": None
            }

    reasoning = result.get("reasoning", "")
    tool_calls_req = result.get("tool_calls", [])
    memory_update = result.get("memory_update", memory_summary)
    sleep_minutes = result.get("sleep_minutes", None)
    status_change = None

    tool_calls_executed = []
    timeline_entries = []
    
    timeline_entries.append({
        "entry_type": "thought",
        "content": reasoning,
        "metadata": {},
        "importance": 3
    })

    for tc in tool_calls_req:
        tool_name = tc.get("tool")
        args = tc.get("args", {})
        
        exec_result = registry.execute_tool(tool_name, args)
        tool_calls_executed.append({
            "tool": tool_name,
            "args": args,
            "result": exec_result
        })
        
        timeline_entries.append({
            "entry_type": "tool_call",
            "content": f"Executed {tool_name}",
            "metadata": {"args": args, "result": exec_result},
            "importance": 4
        })

        if tool_name == "schedule_wakeup":
            sleep_minutes = args.get("minutes", sleep_minutes)
        if tool_name == "close_workflow":
            status_change = "completed"

    return {
        "reasoning": reasoning,
        "tool_calls": tool_calls_executed,
        "timeline_entries": timeline_entries,
        "memory_update": memory_update,
        "sleep_minutes": sleep_minutes,
        "status_change": status_change
    }

def generate_final_summary(client, model: str, order_context: dict, memory_summary: str, full_timeline: list, extra_instructions: list) -> dict:
    prompt = f"""Generate a final summary for this order workflow.
Order Context: {json.dumps(order_context)}
Memory Summary: {memory_summary}
Extra Instructions: {json.dumps(extra_instructions)}
Timeline: {json.dumps(full_timeline, indent=2)}

Return a JSON object:
{{
    "summary": "overall summary",
    "actions_taken": ["action 1", "action 2"],
    "key_learnings": ["learning 1"],
    "recommendations": ["recommendation 1"]
}}"""

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)
