import json

def classify_event(client, model: str, event_type: str, event_data: dict, memory_summary: str, aggressiveness: str) -> dict:
    always_wake = {"payment_failed", "refund_requested", "customer_message_received"}
    
    if event_type in always_wake:
        return {"should_wake": True, "reason": f"{event_type} is an ALWAYS_WAKE event"}
    
    if aggressiveness == "high":
        return {"should_wake": True, "reason": "Aggressiveness is high"}
    
    if aggressiveness == "low":
        low_wake = always_wake | {"delivered", "shipment_delayed"}
        if event_type in low_wake:
            return {"should_wake": True, "reason": f"{event_type} is in low-aggressiveness wake list"}
        return {"should_wake": False, "reason": f"{event_type} ignored on low aggressiveness"}
    
    # medium aggressiveness -> use LLM
    prompt = f"""Determine if this event warrants immediate agent attention given the context.
Event Type: {event_type}
Event Data: {json.dumps(event_data)}
Memory Summary: {memory_summary}

Return a JSON object:
{{
    "should_wake": boolean,
    "reason": "explanation"
}}"""

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    result = json.loads(response.choices[0].message.content)
    return {
        "should_wake": result.get("should_wake", False),
        "reason": result.get("reason", "No reason provided")
    }
