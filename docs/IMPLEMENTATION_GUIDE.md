# Implementation Guide V1

This document explains each project step in detail from architecture, code,
execution, and evolution perspectives.

## V1 Goal

Build an operational baseline that:
- intercepts prompts on AI platforms,
- decides a security action,
- logs incidents,
- exposes incidents in a dashboard.

## Step 1 - Define shared contracts

Why:
- prevent extension, API, and dashboard from interpreting payloads differently.

Files:
- `packages/shared-types/src/analyze.ts`

Expected result:
- a single type for analysis requests,
- a single type for analysis responses,
- explicit enums/unions for actions.

## Step 2 - Build the analysis API (FastAPI)

Why:
- centralize security decisions.

Sub-steps:
1. Define validation schemas (`app/schemas/analyze.py`)
2. Create deterministic detectors (`app/core/detectors.py`)
3. Create policy engine (`app/core/policy_engine.py`)
4. Expose `POST /v1/analyze` (`app/api/routes_analyze.py`)
5. Wire app and health checks (`app/main.py`)

V1 behavior:
- detects PII and technical secrets with regex,
- computes a simple risk score,
- returns `ALLOW`, `ANONYMIZE`, `BLOCK`, or `WARN`.

## Step 3 - Build the Chrome MV3 extension

Why:
- the guardrail must act before data leaves the user's workstation.

Sub-steps:
1. `manifest.json` to declare permissions and scripts
2. `contentScript.js` to:
   - detect AI input fields (`textarea`, `contenteditable`)
   - intercept Send click / Enter
   - extract prompt text
3. `background.js` to call the API
4. `redactor.js` to anonymize locally
5. `siteConfigs.js` to declare supported domains
6. `popup.html/js` and `options.html/js` for local controls

Important points:
- always prioritize fast local analysis before remote calls,
- never block browser usage for long in case of API failure.

## Step 4 - Build the Next.js dashboard

Why:
- provide operational visibility (incidents, trends, severity).

Sub-steps:
1. Initialize a minimal app router
2. Add home and incidents pages
3. Add API client (`lib/api.ts`)
4. Handle "API unavailable" state cleanly

## Step 5 - Add MongoDB persistence

Why:
- keep incident history and audit decisions.

Sub-steps:
1. Start Mongo via `infra/docker/docker-compose.yml`
2. Create useful indexes via `infra/mongodb/init.js`
3. Connect API to Mongo (next phase: full repository engine)

## Step 6 - Quality and security

Minimum checklist:
- unit tests for policy engine
- API integration tests
- lint frontend/backend
- log retention policies
- prompt redaction in logs
- strict network timeouts from extension to API

## Step 7 - Multi-agent evolution (LangGraph)

V1 keeps simple logic. V2 will introduce:
- `AFE` (prompt analysis)
- `AVS` (response validation)
- `ASI` (incident monitoring)
- `AC` (ambiguous-case arbitration)

The right insertion point is `services/security-api/app/agents/`.

## How to read the code efficiently

Recommended order:
1. `packages/shared-types/src/analyze.ts`
2. `services/security-api/app/schemas/analyze.py`
3. `services/security-api/app/core/policy_engine.py`
4. `services/security-api/app/api/routes_analyze.py`
5. `apps/browser-extension/src/contentScript.js`
6. `apps/browser-extension/src/background.js`
7. `apps/admin-dashboard/app/incidents/page.tsx`

Each file contains short comments that explain intent.
