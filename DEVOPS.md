# DevOps Guide — Confidential Agent

This guide documents the CI/CD pipeline for this project.

---

## Overview

```
Local code
     │
     ▼ git push
GitHub (repository)
     │
     ▼ triggers automatically
GitHub Actions (CI/CD)
     │
     ├─► Frontend job   → lint + test + build dashboard & extension + deploy to Vercel
     ├─► Backend job    → lint + security scan + test + build Docker image + deploy to Koyeb
     └─► CI / Release   → CI gate + extension release zips + GitHub Release on tag
```

**DevOps = automate everything repetitive** so you can focus on writing code.

---

## Workflow files

```
confidential-agent/
└── .github/
    └── workflows/
        ├── frontend.yml   ← Dashboard (Next.js) + Browser Extension — CI/CD
        ├── backend.yml    ← Python API (security-api)  — CI/CD
        └── ci.yml         ← CI gate + release builds + GitHub Release on tag
```

Each workflow only triggers when its own files change (monorepo path filters).

---

## Workflow 1 — Frontend

**File:** [.github/workflows/frontend.yml](.github/workflows/frontend.yml)

**Triggers:** any push or PR that touches `apps/admin-dashboard/**`, `apps/browser-extension/**`, or the workflow file itself.

```
Push / PR (frontend files changed)
              │
    ┌─────────┴──────────┐
    │   Dashboard        │   Extension
    │   npm ci           │   npm ci
    │   tsc --noEmit     │   vitest run
    │   next build       │   build:chrome
    └─────────┬──────────┘
              │
    if main ──┤
              ├── build:firefox + build:edge + package zips → upload artifacts
              └── vercel deploy --prod
    if PR  ───└── vercel deploy (preview URL)
```

**Concurrency:** previous runs are automatically cancelled on the same branch / PR.
Deploys on `main` are never cancelled mid-flight.

---

## Workflow 2 — Backend

**File:** [.github/workflows/backend.yml](.github/workflows/backend.yml)

**Triggers:** any push or PR that touches `services/security-api/**` or the workflow file itself.

```
Push / PR (backend files changed)
              │
         uv sync --group dev
              │
         black --check     (formatting)
         ruff check        (linting)
         mypy              (type checking)
         bandit -ll        (security scan — blocks on HIGH severity)
         pytest --cov      (tests + coverage report)
              │
    if main ──┤
              ├── docker build + push → ghcr.io/.../security-api:latest
              └── POST koyeb.com/v1/services/{id}/redeploy
```

**Quality gates run on every push, not only on main.**

### Why Bandit?

Bandit is to Python what `npm audit` is to Node: it detects dangerous patterns in source code (hardcoded secrets, `eval`, SQL injection, shell injection). The `-ll` flag means only **HIGH severity** findings block the pipeline — informational warnings are reported but do not fail the build.

### Why Docker?

Docker packages the application and all its dependencies into a single portable image.
"works on my machine" → "works everywhere."

#### Multi-stage build (Dockerfile)

```dockerfile
# Stage 1: builder — install deps, download spaCy models
FROM python:3.11-slim AS builder
# ...

# Stage 2: runtime — lean final image, no build tools
FROM python:3.11-slim AS runtime
COPY --from=builder ...
```

Result: image ~3× smaller, faster to pull and start.

---

## Workflow 3 — CI / Release

**File:** [.github/workflows/ci.yml](.github/workflows/ci.yml)

**Triggers:**

- Push or PR touching `.github/workflows/ci.yml` → CI gate (echo checkpoint)
- Push of a `v*.*.*` tag → full release flow
- Manual dispatch → manual release build

```
git push origin v1.2.3
              │
         npm ci (extension)
         vitest run
         build:chrome + build:firefox + build:edge
         zip each browser dist/
              │
         softprops/action-gh-release
         → GitHub Release with auto-generated notes + .zip attachments
```

**How to trigger a release:**

```bash
git tag v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3
```

Tags containing `-rc` or `-beta` are automatically marked as pre-releases.

---

## Required GitHub Secrets

Go to: **GitHub → your repo → Settings → Secrets and variables → Actions**

### Koyeb (API deployment)

| Secret             | Description        | Where to find                      |
| ------------------ | ------------------ | ---------------------------------- |
| `KOYEB_API_KEY`    | Koyeb API key      | app.koyeb.com → Account → API Keys |
| `KOYEB_SERVICE_ID` | Service identifier | Koyeb → your service → URL         |

**First-time Koyeb setup:**

1. Go to app.koyeb.com → Create Service → Docker
2. Image: `ghcr.io/YOUR-GITHUB-USERNAME/YOUR-REPO/security-api:latest`
3. Port: `8080`
4. Add all environment variables (see section below)
5. Deploy once manually
6. Copy the service ID from the URL

### Vercel (Dashboard deployment)

| Secret              | Description           | Where to find                              |
| ------------------- | --------------------- | ------------------------------------------ |
| `VERCEL_TOKEN`      | Vercel personal token | vercel.com → Settings → Tokens             |
| `VERCEL_ORG_ID`     | Team / org ID         | vercel.com/account → Settings → Team ID    |
| `VERCEL_PROJECT_ID` | Project ID            | `.vercel/project.json` after `vercel link` |

**Link your Vercel project:**

```bash
npm i -g vercel
cd apps/admin-dashboard
vercel link
cat .vercel/project.json   # shows orgId and projectId
```

---

## Environment Variables

### API — configure in Koyeb → Service → Settings → Environment Variables

```
APP_ENV=production
MONGODB_URI=mongodb+srv://...
QDRANT_URL=https://...
QDRANT_API_KEY=...
AUTH_SECRET_KEY=...          # generate with: openssl rand -hex 32
GROQ_API_KEY=...
SPACY_ENABLED=true
```

### Dashboard — configure in Vercel → Project → Settings → Environment Variables

```
NEXT_PUBLIC_API_URL=https://your-api.koyeb.app
```

---

## Branch Strategy (simplified Git Flow)

```
main          ← Production (protected, merge via PR only)
  │
develop       ← Integration (merge features here before main)
  │
feature/xxx   ← Feature branches
fix/xxx       ← Bug fix branches
```

**Golden rule:** never push directly to `main`.

**Daily workflow:**

```bash
git checkout develop
git pull
git checkout -b feature/my-feature

# ... work, commit ...

git push origin feature/my-feature
# Open a PR on GitHub → CI runs → review → merge
```

**What triggers on each push:**

```
git push feature/xxx   → frontend and/or backend CI (tests + lint only, no deploy)
git push develop       → frontend and/or backend CI (tests + lint only, no deploy)
git push main          → CI + deploy (only workflows whose files changed)
git push v1.2.3        → full extension release build + GitHub Release
```

---

## Python Code Quality

The backend enforces four automated gates on every push:

| Tool     | Role                                          | Config                          |
| -------- | --------------------------------------------- | ------------------------------- |
| `black`  | Formatting (non-negotiable style)             | `pyproject.toml [tool.black]`   |
| `ruff`   | Fast linting (replaces flake8 + isort)        | `pyproject.toml [tool.ruff]`    |
| `mypy`   | Static type checking                          | `pyproject.toml [tool.mypy]`    |
| `bandit` | Security vulnerability scanning               | `-ll` flag (HIGH severity only) |
| `pytest` | Unit tests + coverage report (XML + terminal) | `pyproject.toml [tool.pytest]`  |

**Run locally before pushing:**

```bash
cd services/security-api
uv run black app/ tests/
uv run ruff check app/ tests/
uv run mypy app/
uv run bandit -r app/ -ll
uv run pytest tests/ -v --cov=app
```

**After adding new dev dependencies**, update the lockfile:

```bash
uv lock
```

---

## Useful Commands

```bash
# Test the Docker image locally before pushing
cd services/security-api
docker build -t security-api-test .
docker run -p 8080:8080 --env-file .env security-api-test

# View workflow logs
# → GitHub → Actions → click the run

# Force a redeployment without a code change
# → GitHub → Actions → Backend → Run workflow

# Manual extension release build
# → GitHub → Actions → CI → Run workflow → check "Create a GitHub Release"
```

---

## Possible Future Improvements

- [ ] **Slack / Discord notifications** on deployment failure
- [ ] **Health checks** — verify the API responds after deploy before marking success
- [ ] **Automatic rollback** — revert to previous image if health check fails
- [ ] **Staging environment** — deploy `develop` to a Koyeb staging service before `main`
- [ ] **Dependabot** — automated dependency updates
- [ ] **pytest coverage gate** — fail if coverage drops below a threshold (e.g. 80%)
- [ ] **Vitest coverage** — add `@vitest/coverage-v8` to the extension for HTML/XML reports
