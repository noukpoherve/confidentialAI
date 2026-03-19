# Confidential-Agent Workflow Guide (Notion Ready)

This document explains how the current multi-agent backend works, where LangGraph is used, and how to test each workflow.
You can paste it directly into Notion as a technical reference page.

## 1) Product workflow at a glance

```mermaid
flowchart LR
    U[User on AI platform] --> E[Chrome Extension]
    E -->|Prompt before send| API[security-api FastAPI]
    API --> LG[LangGraph Orchestrator]
    LG --> D[Decision: ALLOW / ANONYMIZE / WARN / BLOCK]
    D --> E
    API --> I[Incident Store]
    I --> M[(MongoDB or In-Memory Fallback)]
    API --> T[Telegram Alert Hook]
    E -->|Optional response check| API
```

## 2) LangGraph usage in this system

LangGraph is used in `services/security-api/app/agents/orchestrator.py`.

Two state graphs are compiled:

1. Prompt graph
   - `afe` node: input filtering analysis
   - `ac` node: arbitration
   - trace example: `["afe", "ac"]`

2. Response graph
   - `avs` node: AI response validation
   - `ac` node: arbitration
   - trace example: `["avs", "ac"]`

The API returns this execution order as `graphTrace` so each decision is auditable.

## 3) Endpoint workflows

### A) Prompt analysis workflow

Endpoint: `POST /v1/analyze`

```mermaid
flowchart TD
    A[Request: prompt] --> B[LangGraph Prompt Graph]
    B --> C[AFE node]
    C --> D[AC node]
    D --> E[AnalyzeResponse with graphTrace]
    E --> F[Persist incident]
    F --> G[Optional Telegram alert]
```

### B) Response validation workflow

Endpoint: `POST /v1/validate-response`

```mermaid
flowchart TD
    A[Request: responseText] --> B[LangGraph Response Graph]
    B --> C[AVS node]
    C --> D[AC node]
    D --> E[ValidateResponseResponse with graphTrace]
    E --> F[Persist incident]
    F --> G[Optional Telegram alert]
```

### C) Incident retrieval workflow

Endpoint: `GET /v1/incidents`

- reads incidents from MongoDB if reachable
- otherwise uses in-memory fallback
- returns incident list and `total`

## 4) Agent responsibilities

- `AFE` (Input Filtering Agent): prompt-level risk decision
- `AVS` (AI Validation Sentinel): response-level risk decision
- `AC` (Arbitration Controller): confirms/adjusts ambiguous decisions
- `ASI` (Alerting and Surveillance Intelligence): sends critical notifications (Telegram hook)

## 5) Runtime observability

The following fields are now available for tracing:

- API responses: `graphTrace`
- stored incidents: `graphTrace`, `incidentType`, `contentPreview`

This provides a minimal but concrete explanation of what the LangGraph pipeline executed.

## 6) How to test at this stage

From `services/security-api`:

```bash
uv run pytest -q
```

Run only orchestrator tests:

```bash
uv run pytest -q tests/test_langgraph_orchestrator.py
```

Run only API incident tests:

```bash
uv run pytest -q tests/test_api_incidents.py
```

Manual API checks (after starting server):

- `GET /health`
- `POST /v1/analyze`
- `POST /v1/validate-response`
- `GET /v1/incidents`

Expected:

- analyze response includes `graphTrace: ["afe", "ac"]`
- validate-response includes `graphTrace: ["avs", "ac"]`
- incidents include `incidentType` and `graphTrace`

## 7) Current limits and next increment

Current agent nodes still rely on deterministic policy logic.
Next increment is to replace or augment node internals with model-assisted reasoning while preserving:

- test coverage
- graph traceability
- fail-open resilience for persistence/alerting
