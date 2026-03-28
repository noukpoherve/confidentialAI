# Step-by-step Checklist

## Phase 0 - Bootstrap local

- [ ] Install Node.js 20+
- [ ] Install Python 3.11-3.13
- [ ] Install Docker Desktop
- [ ] Verify free ports: 3000, 8080, 27017

## Phase 1 - API first

- [ ] Pin Python version with `uv python pin 3.13`
- [ ] Install dependencies with `uv sync --group dev`
- [ ] Run `uvicorn app.main:app --reload --port 8080`
- [ ] Test `GET /health`
- [ ] Test `POST /v1/analyze`
- [ ] Run tests `uv run pytest`

## Phase 2 - Extension Chrome

- [ ] Load unpacked extension
- [ ] Configure API URL in options
- [ ] Open ChatGPT/Claude/Gemini
- [ ] Type a prompt containing an email or a secret
- [ ] Verify `ANONYMIZE` or `BLOCK` action

## Phase 3 - Dashboard

- [ ] Run `npm install` in `apps/admin-dashboard`
- [ ] `npm run dev`
- [ ] Open `/` then `/incidents`
- [ ] Verify clean behavior when API is down

## Phase 4 - MongoDB (optional in V1)

- [ ] Run `docker compose up -d` in `infra/docker`
- [ ] Verify `incidents` collection is created
- [ ] Verify indexes from Mongo shell

## Phase 5 - V2 hardening

- [ ] Integrate real Mongo repository in API
- [ ] Add dashboard/API auth
- [ ] Add tenant policies
- [ ] Integrate LangGraph workflow
- [ ] Add Telegram alerts
