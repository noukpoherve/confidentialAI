# confidential-Agent

Monorepo for building a user-side DLP (Data Loss Prevention) guardrail for
generative AI platforms (ChatGPT, Claude, Gemini, and others).

The current product scope is:
- intercept prompts before submission,
- analyze risk,
- apply a decision (`ALLOW`, `ANONYMIZE`, `BLOCK`, `WARN`),
- log incidents,
- provide an admin dashboard.

## 1) Technical Vision

The project is split into two layers:

1. Local browser layer
   - Chrome MV3 extension
   - user input interception
   - local sensitive-pattern detection
   - optional local anonymization
   - backend API call for final arbitration

2. Server security layer
   - FastAPI prompt analysis API
   - deterministic rules engine with risk score
   - agent orchestration (LangGraph planned next)
   - MongoDB incident storage
   - Next.js admin dashboard

## 2) Repository Structure

```text
confidential-Agent/
  apps/
    browser-extension/      # Chrome MV3 extension
    admin-dashboard/        # Next.js dashboard
  services/
    security-api/           # FastAPI backend
  packages/
    shared-types/           # Shared TypeScript contracts
  infra/
    docker/                 # Local docker-compose
    mongodb/                # Mongo init and indexes
  docs/                     # Detailed documentation
  scripts/                  # Utility scripts (next phase)
```

## 3) End-to-End V1 Flow

1. The user types a prompt in an AI input field.
2. The content script intercepts the prompt before submission.
3. Local logic checks for sensitive patterns.
4. The extension calls `POST /v1/analyze` on `security-api`.
5. The API computes:
   - risk score,
   - reasons,
   - redaction proposals,
   - final action.
6. The extension applies the action:
   - `ALLOW` -> submit as-is,
   - `ANONYMIZE` -> redact locally, then submit,
   - `BLOCK` -> stop submission and alert the user,
   - `WARN` -> ask for explicit user confirmation.
7. The incident is logged (MongoDB when available, in-memory fallback otherwise).
8. The dashboard displays incidents and status.

## 4) Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11 to 3.13
- Docker (optional, recommended for MongoDB)

### 4.1 Run the API

```bash
cd services/security-api
uv python pin 3.13
uv sync --group dev
uv run uvicorn app.main:app --reload --port 8080
```

### 4.2 Run MongoDB (optional)

```bash
cd infra/docker
docker compose up -d
```

### 4.3 Install the extension in dev mode

1. Open `chrome://extensions`.
2. Enable "Developer mode".
3. Click "Load unpacked".
4. Select `apps/browser-extension`.

### 4.4 Run the dashboard

```bash
cd apps/admin-dashboard
npm install
npm run dev
```

Open `http://localhost:3000`.

## 5) Current Capabilities

This V1 currently includes:
- a shared analysis contract,
- a working scoring/action API,
- an extension that intercepts prompts and calls the API,
- a basic dashboard connected to the API,
- step-by-step documentation in `docs/`.

Engineering standards are defined in `docs/ENGINEERING_STANDARDS.md`.

## 6) Next Steps (Roadmap)

1. Integrate real LangGraph orchestration (`AFE`, `AVS`, `ASI`, `AC`)
2. Add auth + RBAC to dashboard and API
3. Add tenant-specific policies
4. Integrate Telegram alerting
5. Extend support to additional platforms and IDEs
