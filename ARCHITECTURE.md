# Architecture Note — Order Supervisor

## System Overview

The Order Supervisor is a long-running AI agent system that monitors e-commerce orders from creation to completion. Each order gets its own Temporal workflow that persists for the entire lifecycle (hours to days). The agent sleeps between events, wakes up to reason and act, and goes back to sleep — minimizing LLM costs while staying responsive.

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                         │
│   Supervisor Config │ Run Management │ Event Injection │ Timeline│
└────────────────────────────┬─────────────────────────────────────┘
                             │ REST API
┌────────────────────────────▼─────────────────────────────────────┐
│                       FastAPI Backend                            │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │  API Routes  │  │   Temporal   │  │    Agent Module         │ │
│  │  /supervisors│  │   Worker     │  │  ┌───────────────────┐  │ │
│  │  /runs       │  │   (in-proc)  │  │  │ Classifier (8B)   │  │ │
│  │  /events     │  │              │  │  │ Runtime (70B)     │  │ │
│  └──────┬───────┘  └──────┬───────┘  │  │ Tools (9 actions) │  │ │
│         │                 │          │  │ Memory Builder    │  │ │
│         ▼                 ▼          │  └───────────────────┘  │ │
│  ┌─────────────┐  ┌──────────────┐  └─────────────────────────┘ │
│  │ PostgreSQL  │  │  Temporal    │                              │
│  │  Database   │  │  Server     │◄──── Signals (events)        │
│  └─────────────┘  └──────────────┘                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                    Groq API (LLM)                            ││
│  │  Llama 3.3 70B (Agent Reasoning) │ Llama 3.1 8B (Classifier)││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

## Core Design Decisions

### 1. One Temporal Workflow Per Order

Each order gets a dedicated `OrderSupervisorWorkflow` instance. The workflow:
- Starts when a run is created via the API
- Maintains state: pending events, extra instructions, memory summary, sleep duration
- Runs a main loop: sleep → wake → execute agent → sleep
- Ends when the agent calls `close_workflow` or the run is manually terminated

**Why Temporal?** Temporal provides durable execution — the workflow state survives process restarts and can sleep for hours/days without consuming resources.

### 2. Event-Driven Wake/Sleep Cycle

```
                    ┌─────────────┐
         ┌─────────│   SLEEPING   │◄────────┐
         │         └──────┬───────┘         │
         │                │                 │
    [timeout]        [signal]          [set timer]
         │                │                 │
         ▼                ▼                 │
    ┌─────────┐    ┌─────────────┐    ┌─────┴─────┐
    │ Wake:   │    │ Classifier  │    │   Agent    │
    │scheduled│    │ (8B model)  │    │ (70B model)│
    └────┬────┘    └──────┬──────┘    └─────┬─────┘
         │          wake? │                 │
         │         ┌──┴──┐           [reason, act,
         │        yes    no           update memory]
         │         │      │                 │
         ▼         ▼      │                 │
    ┌──────────────────┐  │                 │
    │  Execute Agent   │──┘─────────────────┘
    └──────────────────┘
```

**Three triggers wake the agent:**
1. **Workflow start** — initial processing of the order
2. **Incoming signal** — an external event (filtered by the classifier)
3. **Scheduled timeout** — periodic check-in timer

### 3. Two-Tier LLM Architecture

| Component | Model | Purpose | Latency |
|-----------|-------|---------|---------|
| Classifier | Llama 3.1 8B | Fast event triage — should this event wake the agent? | ~200ms |
| Agent | Llama 3.3 70B | Full reasoning, tool selection, memory update | ~2-5s |

The classifier prevents unnecessary agent wake-ups. For example, a routine `shipment_update` on a healthy order doesn't need the full 70B model — but a `payment_failed` always does.

**Aggressiveness levels:**
- **High**: Wake on every event (good for testing)
- **Medium**: Use LLM classifier for ambiguous events
- **Low**: Only wake on critical events (payment_failed, refund_requested, etc.)

### 4. Agent Runtime (ReAct Pattern)

When the agent wakes, it follows this flow:

```
1. Build Context
   ├── Supervisor base instruction
   ├── Order details (customer, items, total)
   ├── Compact memory summary (from previous runs)
   ├── Recent timeline entries (last 10)
   ├── Pending new events to process
   ├── Extra run-specific instructions
   └── Available tool definitions

2. Call LLM (Groq Llama 3.3 70B)
   └── Returns JSON: { reasoning, tool_calls, memory_update, sleep_minutes }

3. Execute Tools
   ├── send_customer_message, message_fulfillment_team, etc.
   ├── schedule_wakeup → sets next sleep duration
   └── close_workflow → ends the workflow

4. Persist Results
   ├── Save timeline entries (thought + tool_call records)
   ├── Update memory summary
   └── Update sleep_until timestamp
```

### 5. Memory & Timeline Design

**Timeline**: Every agent action is recorded as a `TimelineEntry`:
- `event` — external events that triggered processing
- `thought` — agent's reasoning text
- `tool_call` — tool executions with args and results
- `system` — system-level events (start, pause, resume)

**Memory**: A rolling `MemorySummary` per run that the agent updates after each wake cycle. This keeps the LLM context bounded — instead of feeding the entire timeline, we feed the compact summary + last 10 entries.

### 6. Tool System

9 simulated business actions:

| Tool | Purpose |
|------|---------|
| `send_customer_message` | Notify the customer |
| `message_fulfillment_team` | Contact fulfillment |
| `message_payments_team` | Contact payments |
| `message_logistics_team` | Contact logistics |
| `create_internal_note` | Record internal notes |
| `escalate_issue` | Escalate to human agents |
| `mark_order_for_review` | Flag for manual review |
| `schedule_wakeup` | Set next wake-up timer |
| `close_workflow` | End the workflow |

All tools are mocked — they return confirmation strings. Each execution creates a timeline entry stored in the database.

### 7. Persistence Layer

PostgreSQL database with 5 tables:

```
Supervisor (template config)
    │
    └── Run (one per order)
         ├── TimelineEntry[] (event log)
         ├── MemorySummary (compact memory)
         ├── RunInstruction[] (extra instructions)
         └── final_summary (JSON, end-of-run output)
```

The database URL is configurable via the `DATABASE_URL` environment variable.

### 8. API Design

| Endpoint | Purpose |
|----------|---------|
| `POST /api/supervisors` | Create supervisor template |
| `GET /api/supervisors` | List templates |
| `POST /api/runs` | Start new run (creates workflow) |
| `GET /api/runs/{id}` | Get run detail + timeline + memory |
| `POST /api/runs/{id}/events` | Inject event (sends Temporal signal) |
| `POST /api/runs/{id}/instructions` | Add run-specific instruction |
| `POST /api/runs/{id}/pause` | Pause run |
| `POST /api/runs/{id}/resume` | Resume run |
| `POST /api/runs/{id}/terminate` | Terminate run |

### 9. End-of-Run Output

When a workflow completes (via `close_workflow` tool or manual termination), the system generates:
- **Summary**: Overview of the order lifecycle
- **Actions taken**: List of key actions executed
- **Key learnings**: Insights gained during supervision
- **Recommendations**: Suggestions for process improvement

This is generated by the 70B model using the full timeline and memory as input.

## Tradeoffs & Simplifications

1. **PostgreSQL**: Used PostgreSQL for reliable persistence. SQLite can be used for local testing by setting the `DATABASE_URL` env to `sqlite+aiosqlite:///./order_supervisor.db`.
2. **In-process Temporal worker**: The Temporal worker runs as an asyncio task inside the FastAPI process for simplicity. In production, it would be a separate service.
3. **Mocked tools**: All business actions return confirmation strings. Real integrations would hit external APIs.
4. **Single-agent**: No sub-agent coordination. One agent per order handles everything.
5. **No auth**: No user authentication — this is a POC focused on the agent orchestration pattern.
