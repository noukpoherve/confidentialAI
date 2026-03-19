# Architecture V1

## Components

1. Chrome extension (`apps/browser-extension`)
2. Security API (`services/security-api`)
3. Admin dashboard (`apps/admin-dashboard`)
4. Shared contracts (`packages/shared-types`)
5. Persistence (`infra/mongodb`)

## "Before submit" sequence

1. User types a prompt
2. `contentScript.js` detects submit intent
3. `background.js` calls `POST /v1/analyze`
4. `policy_engine.py` returns a decision
5. Extension applies the decision locally
6. Incident becomes visible (V1: stub endpoint, V2: full storage)

## Why this architecture is solid

- Clear separation of responsibilities
- Centralized server-side decisions
- Immediate client-side action
- Explicit inter-component contracts
- Healthy baseline for later LangGraph integration

## Extension: critical points

- Pre-submit interception
- API timeout/error handling
- Clear warning/block UX
- Reversible local redaction is not required (replace before submit)

## API: critical points

- Strict payload validation
- Explainable deterministic scoring
- Evolution path to Mongo repository + LangGraph agents
- Stable versioned endpoints (`/v1`)

## Dashboard: critical points

- Reliable rendering even if API is down
- Readable incident views
- Ready for multi-tenant auth

## Evolution V2/V3

- Add agents `AFE`, `AVS`, `ASI`, `AC`
- Per-company policies
- Telegram alerts
- IDE support via native extension or local proxy
