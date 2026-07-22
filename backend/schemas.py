from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any, Optional
from datetime import datetime

class SupervisorCreate(BaseModel):
    name: str
    base_instruction: str
    available_tools: List[str]
    default_wakeup_minutes: int = 240
    wakeup_aggressiveness: str = "medium"
    model_name: str = "llama-3.3-70b-versatile"

class SupervisorResponse(BaseModel):
    id: str
    name: str
    base_instruction: str
    available_tools: List[str]
    default_wakeup_minutes: int
    wakeup_aggressiveness: str
    model_name: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RunCreate(BaseModel):
    supervisor_id: str
    order_id: str
    order_context: Dict[str, Any]

class TimelineEntryResponse(BaseModel):
    id: str
    timestamp: datetime
    entry_type: str
    content: str
    metadata_json: Dict[str, Any]
    importance: int
    compacted: bool
    model_config = ConfigDict(from_attributes=True)

class MemoryResponse(BaseModel):
    id: str
    summary: str
    key_facts: List[str]
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class InstructionResponse(BaseModel):
    id: str
    instruction: str
    added_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RunResponse(BaseModel):
    id: str
    supervisor_id: str
    order_id: str
    order_context: Dict[str, Any]
    status: str
    workflow_id: str
    sleep_until: Optional[datetime]
    created_at: datetime
    completed_at: Optional[datetime]
    final_summary: Optional[Dict[str, Any]]
    model_config = ConfigDict(from_attributes=True)

class RunDetailResponse(RunResponse):
    timeline_entries: List[TimelineEntryResponse]
    memory: Optional[MemoryResponse]
    instructions: List[InstructionResponse]
    model_config = ConfigDict(from_attributes=True)

class EventInject(BaseModel):
    type: str
    data: Dict[str, Any]

class InstructionAdd(BaseModel):
    instruction: str
