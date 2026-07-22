import uuid
from datetime import datetime
from sqlalchemy import String, Text, JSON, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Supervisor(Base):
    __tablename__ = "supervisors"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String)
    base_instruction: Mapped[str] = mapped_column(Text)
    available_tools: Mapped[list] = mapped_column(JSON)
    default_wakeup_minutes: Mapped[int] = mapped_column(Integer, default=240)
    wakeup_aggressiveness: Mapped[str] = mapped_column(String, default="medium")
    model_name: Mapped[str] = mapped_column(String, default="llama-3.3-70b-versatile")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    runs = relationship("Run", back_populates="supervisor")

class Run(Base):
    __tablename__ = "runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    supervisor_id: Mapped[str] = mapped_column(String, ForeignKey("supervisors.id"))
    order_id: Mapped[str] = mapped_column(String)
    order_context: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String, default="active")
    workflow_id: Mapped[str] = mapped_column(String)
    sleep_until: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    final_summary: Mapped[dict] = mapped_column(JSON, nullable=True)

    supervisor = relationship("Supervisor", back_populates="runs")
    timeline_entries = relationship("TimelineEntry", back_populates="run", order_by="TimelineEntry.timestamp")
    memory = relationship("MemorySummary", back_populates="run", uselist=False)
    instructions = relationship("RunInstruction", back_populates="run", order_by="RunInstruction.added_at")

class TimelineEntry(Base):
    __tablename__ = "timeline_entries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    run_id: Mapped[str] = mapped_column(String, ForeignKey("runs.id"))
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    entry_type: Mapped[str] = mapped_column(String) # event/thought/tool_call/system
    content: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[dict] = mapped_column(JSON)
    importance: Mapped[int] = mapped_column(Integer, default=3)
    compacted: Mapped[bool] = mapped_column(Boolean, default=False)

    run = relationship("Run", back_populates="timeline_entries")

class MemorySummary(Base):
    __tablename__ = "memory_summaries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    run_id: Mapped[str] = mapped_column(String, ForeignKey("runs.id"), unique=True)
    summary: Mapped[str] = mapped_column(Text)
    key_facts: Mapped[list] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    run = relationship("Run", back_populates="memory")

class RunInstruction(Base):
    __tablename__ = "run_instructions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    run_id: Mapped[str] = mapped_column(String, ForeignKey("runs.id"))
    instruction: Mapped[str] = mapped_column(Text)
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    run = relationship("Run", back_populates="instructions")
