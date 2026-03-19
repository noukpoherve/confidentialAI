# security-api

Central security decision API for AI prompts.

## Endpoints V1

- `GET /health`
- `POST /v1/analyze`
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
- LLM support comes next (future phase)
- explainable decisions (reasons + detections + redactions)
- incident persistence uses MongoDB when available, with in-memory fallback for local dev
