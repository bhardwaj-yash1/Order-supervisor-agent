# Order Supervisor

A long-running AI supervisor POC that oversees e-commerce orders from creation to completion. Built with Temporal workflows, FastAPI, and Next.js.

## Architecture

```
┌─────────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Next.js Frontend  │────▶│  FastAPI Backend  │────▶│  Temporal Server │
│   (port 3000)       │     │  (port 8000)      │     │  (port 7233)     │
└─────────────────────┘     └──────────┬───────┘     └──────────────────┘
                                       │
                            ┌──────────┴───────┐
                            │                  │
                     ┌──────▼─────┐    ┌───────▼──────┐
                     │   SQLite   │    │   Groq API   │
                     │   (local)  │    │ (Llama 3 70B)│
                     └────────────┘    └──────────────┘
```

### Key Components

- **Temporal Workflow**: One workflow per order. Handles sleep/wake lifecycle, signal handling, and event-driven agent execution.
- **Agent Runtime**: ReAct-style LLM agent (Groq Llama 3.3 70B) that reasons about events, calls tools, and manages memory.
- **Classifier**: Lightweight LLM (Llama 3.1 8B) that determines if incoming events should immediately wake the agent.
- **6 Simulated Tools**: send_customer_message, create_internal_note, escalate_issue, mark_order_for_review, schedule_wakeup, close_workflow.
- **Memory & Timeline**: Rolling memory summary with timeline compaction to keep LLM context bounded.
- **Next.js UI**: Dashboard for supervisor config, run management, event injection, and timeline inspection.

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Frontend       | Next.js 14 (App Router) + Tailwind  |
| Backend        | Python FastAPI                      |
| Orchestration  | Temporal Python SDK                 |
| Database       | SQLite (via SQLAlchemy)             |
| LLM (Agent)    | Groq API → Llama 3.3 70B Versatile |
| LLM (Classifier)| Groq API → Llama 3.1 8B Instant  |

## Prerequisites

- Python 3.11+
- Node.js 18+
- [Temporal CLI](https://docs.temporal.io/cli) (`winget install Temporal.TemporalCLI`)
- [Groq API Key](https://console.groq.com) (free tier)

## Setup

### 1. Clone and Install

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Configure Environment

```bash
# Copy and edit .env
cp .env.example .env
# Add your Groq API key to .env
```

### 3. Start Services (3 terminals)

**Terminal 1 — Temporal Server:**
```bash
temporal server start-dev
```

**Terminal 2 — Backend (FastAPI + Temporal Worker):**
```bash
python -m backend.main
```

**Terminal 3 — Frontend:**
```bash
cd frontend && npm run dev
```

### 4. Open Browser

- **App**: http://localhost:3000
- **Temporal UI**: http://localhost:8233
- **API Docs**: http://localhost:8000/docs

## Usage Walkthrough

### 1. Create a Supervisor Config
Navigate to `/supervisors` and create a supervisor template:
- Name: "E-commerce Order Supervisor"
- Instruction: "You are an AI order supervisor. Monitor the lifecycle of e-commerce orders. Notify customers of important updates. Escalate issues that need human attention."
- Select all 6 tools
- Set wake-up interval (e.g., 60 minutes)
- Choose aggressiveness: medium

### 2. Start a Run
Navigate to `/runs` and click "Start New Run":
- Select your supervisor
- Enter an Order ID (e.g., "ORD-1234")
- Add order context JSON (customer name, items, total, etc.)

### 3. Observe Agent Behavior
The run detail page shows:
- **Timeline**: Real-time feed of agent thoughts, tool calls, and events
- **Memory**: Current compact memory summary
- **Status**: Active/sleeping/paused with next wake-up time

### 4. Inject Events
Use the Event Injector panel to simulate order lifecycle events:
- `payment_confirmed` → Agent notes payment, schedules next check
- `shipment_delayed` → Agent wakes immediately, notifies customer
- `delivered` → Agent closes workflow, generates final summary

### 5. Add Instructions
Add run-specific instructions mid-flight:
- "Prioritize speed over cost for this order"
- "If delayed, escalate to logistics team"

### 6. Control the Run
- **Pause**: Suspends agent execution
- **Resume**: Continues from where it paused
- **Terminate**: Triggers final summary and ends the workflow

### 7. View Final Summary
After completion, the run shows:
- Summary of the order lifecycle
- Actions the agent took
- Key learnings
- Recommendations

## API Reference

| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| POST   | `/api/supervisors`                | Create supervisor template     |
| GET    | `/api/supervisors`                | List supervisors               |
| GET    | `/api/supervisors/{id}`           | Get supervisor details         |
| POST   | `/api/runs`                       | Create run (starts workflow)   |
| GET    | `/api/runs`                       | List runs                      |
| GET    | `/api/runs/{id}`                  | Get run details + timeline     |
| POST   | `/api/runs/{id}/events`           | Inject event into workflow     |
| POST   | `/api/runs/{id}/instructions`     | Add run-specific instruction   |
| POST   | `/api/runs/{id}/pause`            | Pause run                      |
| POST   | `/api/runs/{id}/resume`           | Resume run                     |
| POST   | `/api/runs/{id}/terminate`        | Terminate run                  |

## Project Structure

```
order-supervisor/
├── backend/
│   ├── main.py              # FastAPI app + Temporal worker startup
│   ├── config.py             # Settings (Groq key, Temporal addr)
│   ├── database.py           # SQLAlchemy async + sync engines
│   ├── models.py             # ORM models
│   ├── schemas.py            # Pydantic schemas
│   ├── api/                  # FastAPI route handlers
│   ├── agent/                # LLM agent runtime, tools, classifier, memory
│   └── temporal/             # Workflow, activities, worker
├── frontend/
│   └── src/
│       ├── app/              # Next.js pages (dashboard, supervisors, runs)
│       ├── components/       # Reusable UI components
│       └── lib/              # API client
├── requirements.txt
├── .env.example
└── README.md
```
