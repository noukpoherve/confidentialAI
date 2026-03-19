# security-api

Central security decision API for AI prompts.

## Endpoints V1

- `GET /health`
- `POST /v1/analyze`
- `POST /v1/validate-response`
- `GET /v1/incidents`

## Run locally

```bash
uv python pin 3.13
uv sync --group dev
uv run uvicorn app.main:app --reload --port 8080
```

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

## Optional Telegram alerts

Set the following env vars to enable alerting for critical incidents:

- `TELEGRAM_ALERTS_ENABLED=true`
- `TELEGRAM_BOT_TOKEN=<token>`
- `TELEGRAM_CHAT_ID=<chat_id>`
- `TELEGRAM_ALERT_ACTIONS=BLOCK,WARN`

## Optional LLM-sensitive classifier

Set these env vars to enable dynamic LLM classification in the graph:

- `LLM_CLASSIFIER_ENABLED=true`
- `LLM_CLASSIFIER_API_KEY=<api_key>` (or `OPENAI_API_KEY`)
- `LLM_CLASSIFIER_API_BASE=https://api.openai.com/v1`
- `LLM_CLASSIFIER_MODEL=gpt-4.1-mini`
- `LLM_CLASSIFIER_TIMEOUT_SECONDS=2.5`
