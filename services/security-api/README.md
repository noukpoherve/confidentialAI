# security-api

Central security decision API for AI prompts.

## Endpoints V1

- `GET /health` — liveness + non-secret LLM / classifier flags (`llmClassifierEnabled`, `llmKeyConfigured`, `llmApiHost`, `llmModel`)
- `POST /v1/analyze`
- `POST /v1/validate-response`
- `POST /v1/analyze-image` — image moderation (omni-moderation); optional safe-mode thresholds (`SAFE_MODE_*` in `app/core/config.py`)
- `GET /v1/incidents`
- `POST /v1/site-signals`
- `GET /v1/site-signals/recent`
- `GET /v1/site-signals/summary`
- `POST /v1/auth/signup`
- `POST /v1/auth/login`
- `GET /v1/auth/me`
- `GET /v1/users/me/settings`
- `PUT /v1/users/me/settings`

## Run locally

```bash
uv python pin 3.13
uv sync --group dev
uv run python -m spacy download fr_core_news_sm
uv run uvicorn app.main:app --reload --port 8080
```

The spaCy model adds phrase-based **LEGAL_HR** detection on top of regex. If the model is missing, the API still runs; set `SPACY_ENABLED=false` to skip loading spaCy.

## Example request

```bash
curl -X POST http://localhost:8080/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "req-demo-1",
    "platform": "chatgpt",
    "prompt": "My email is bob@example.com and my key is sk_1234567890ABCDEFGHIJKLMNOP",
    "userConsent": false
  }'
```

## V1 Principles

- deterministic first: regex + clear policy engine
- optional LLM classifier can dynamically detect sensitive context
- explainable decisions (reasons + detections + redactions)
- incident persistence uses MongoDB when available, with in-memory fallback for local dev
- agent roles are enabled as pluggable modules (`AFE`, `AVS`, `ASI`, `AC`)
- prompt and response orchestration are executed through LangGraph state graphs

## Optional Qdrant (semantic similarity)

When enabled, the prompt pipeline runs **`AFE` → `vector_search` → `llm_classifier` (skipped on strong match) → `AC` → optional `toxicity_analyzer` → END** (toxicity is skipped when the decision is already `BLOCK` or when `TOXICITY_ANALYZER_ENABLED=false`). Embeddings use OpenAI-compatible **`text-embedding-3-small`** via the same API base/key as the LLM layer. Past **`BLOCK`** / **`WARN`** prompt incidents are indexed after save (Mongo still stores only redacted previews; raw text for indexing is not persisted in Mongo).

- **Fail-open**: if Qdrant or embeddings fail, the API falls back to the normal path (LLM classifier unchanged).
- **Local Docker**: `docker compose -f infra/docker/docker-compose.yml up qdrant -d` then set `QDRANT_URL=http://localhost:6333`.
- **Qdrant Cloud**: set `QDRANT_URL` to the cluster HTTPS URL and `QDRANT_API_KEY` from the cloud dashboard.

Relevant variables (see `.env.example`):

| Variable | Role |
|----------|------|
| `VECTOR_SEARCH_ENABLED` | `true` to activate the node and incident indexing |
| `QDRANT_URL` | HTTP(S) endpoint (local or cloud) |
| `QDRANT_API_KEY` | Required for Qdrant Cloud; omit for local Docker |
| `QDRANT_COLLECTION` | Collection name (default `confidential_agent_incidents`) |
| `EMBEDDING_MODEL` | Default `text-embedding-3-small` |
| `VECTOR_MATCH_MIN_SCORE` | Minimum cosine similarity to reuse a past decision (default `0.88`) |
| `QDRANT_PREFER_GRPC` / `QDRANT_GRPC_PORT` | Optional gRPC client instead of HTTP |

## Optional Telegram alerts

Set the following env vars to enable alerting for critical incidents:

- `TELEGRAM_ALERTS_ENABLED=true`
- `TELEGRAM_BOT_TOKEN=<token>`
- `TELEGRAM_CHAT_ID=<chat_id>`
- `TELEGRAM_ALERT_ACTIONS=BLOCK,WARN`

## Optional LLM-sensitive classifier

**Default:** if `OPENAI_API_KEY` or `LLM_CLASSIFIER_API_KEY` is set, the LLM classifier turns on automatically — you do **not** need `LLM_CLASSIFIER_ENABLED=true` unless you want an explicit override. Set `LLM_CLASSIFIER_ENABLED=false` to force-disable while a key remains in the environment.

Useful overrides:

- `LLM_CLASSIFIER_API_BASE` — OpenAI, Azure OpenAI, LM Studio, Ollama OpenAI adapter, etc.
- `LLM_CLASSIFIER_MODEL` — default `gpt-4.1-mini`
- `LLM_CLASSIFIER_TIMEOUT_SECONDS` — default `2.5` (fail-open: regex path wins if the LLM is slow)

## Optional toxicity analyzer

Uses the same LLM key / base as the classifier when enabled. Defaults follow the classifier (on when a key is present). Override with `TOXICITY_ANALYZER_ENABLED=false` to disable rephrase suggestions on prompts/responses.

## Optional image moderation

Uses OpenAI **`/v1/moderations`** (omni model). Configure `IMAGE_MODERATION_TIMEOUT_SECONDS` if image calls time out (default `45` s). Safe-mode thresholds for sexual content: `SAFE_MODE_ENABLED`, `SAFE_MODE_SEXUAL_THRESHOLD` (see `app/core/config.py`).

## Auth and user settings (SaaS-ready foundation)

- JWT-based authentication (signup/login/profile)
- per-user settings storage for extension targeting preferences
- Mongo-backed when available, in-memory fallback for local development

## Site failure telemetry (admin feedback loop)

- extension posts site-level runtime signals (`SITE_SELECTED`, `PROMPT_ELEMENT_NOT_FOUND`, `API_UNREACHABLE`, `EXTENSION_CONTEXT_INVALIDATED`)
- admin can review recent events and aggregated host-level summary
- this loop helps prioritize platform-specific selector fixes over time
