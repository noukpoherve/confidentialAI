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

## First-time Deployment Checklist

Follow these steps in order the first time you set up the project for production.

### Step 1 — Fork / clone and configure secrets

```bash
git clone https://github.com/YOUR-ORG/confidential-agent.git
cd confidential-agent
```

In GitHub → your repo → **Settings → Secrets and variables → Actions**, create:

| Secret | Value |
|---|---|
| `KOYEB_API_KEY` | Koyeb → Account → API Keys |
| `KOYEB_SERVICE_ID` | Koyeb → your service → copy from URL |
| `VERCEL_TOKEN` | vercel.com → Settings → Tokens |
| `VERCEL_ORG_ID` | vercel.com/account → Settings → Team ID |
| `VERCEL_PROJECT_ID` | run `vercel link` in `apps/admin-dashboard`, then read `.vercel/project.json` |

### Step 2 — Create the Koyeb service (first deploy is manual)

1. Go to app.koyeb.com → **Create Service → Docker**
2. Image: `ghcr.io/YOUR-ORG/confidential-agent/security-api:latest`
3. Port: `8080`
4. Add environment variables:

```
APP_ENV=production
MONGODB_URI=mongodb+srv://...
AUTH_SECRET_KEY=<openssl rand -hex 32>
QDRANT_URL=https://...           # optional
QDRANT_API_KEY=...               # optional
GROQ_API_KEY=...                 # optional
SPACY_ENABLED=true
```

5. Click **Deploy** — this first deployment will fail (image not yet in GHCR). That is expected.
6. After the first `git push main` with backend files, `backend.yml` builds and pushes the image
   and triggers an automatic redeploy via the Koyeb API.

### Step 3 — Link the Vercel project

```bash
npm i -g vercel
cd apps/admin-dashboard
vercel link          # follow the prompts, select your org and project
cat .vercel/project.json   # copy orgId → VERCEL_ORG_ID, projectId → VERCEL_PROJECT_ID
```

Add the Vercel environment variable in the Vercel dashboard:
```
NEXT_PUBLIC_API_URL=https://your-service.koyeb.app
```

### Step 4 — Push to main and verify

```bash
git checkout main
git push origin main
```

Expected outcome:
- `backend.yml` → black ✓, ruff ✓, mypy ✓, bandit ✓, pytest ✓, Docker push ✓, Koyeb redeploy ✓
- `frontend.yml` → lint ✓, build ✓, vitest ✓, Vercel production deploy ✓

Check the **Actions** tab in GitHub for live logs. Each job shows a step-by-step summary in the **Summary** panel.

### Step 5 — Protect the main branch

In GitHub → Settings → Branches → Add rule for `main`:

- [x] Require a pull request before merging
- [x] Require status checks to pass before merging
  - Add required checks: `Frontend (Dashboard + Extension)` and `Backend (Python API)`
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings

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

## Conventional Commits and Issue Linking

This repo follows the [Conventional Commits](https://www.conventionalcommits.org) spec.
Commit messages are parsed by `release-it` to generate `CHANGELOG.md` automatically.

### Commit format

```
<type>(<scope>): <short description>

[optional body]

[optional footer: Closes #N, Refs #N]
```

| Type | When to use |
|---|---|
| `feat` | New feature visible to users |
| `fix` | Bug fix |
| `perf` | Performance improvement (no behavior change) |
| `refactor` | Code restructuring (no behavior change) |
| `test` | Adding or updating tests |
| `ci` | Changes to CI/CD workflows |
| `chore` | Tooling, deps, config (not shipped to users) |
| `docs` | Documentation only |

### Linking to GitHub Issues

Add a footer to your commit message or PR description:

| Keyword | Effect on merge to default branch |
|---|---|
| `Closes #42` | Automatically closes issue #42 |
| `Fixes #42` | Same — alternative spelling |
| `Resolves #42` | Same — alternative spelling |
| `Refs #42` | Creates a link but does not close the issue |

**Examples:**

```bash
# Commit that closes an issue
git commit -m "feat(extension): block prompt on HIGH risk score

Implement the BLOCK action when the API returns risk >= 0.8.

Closes #42"

# Commit that references an issue without closing it
git commit -m "fix(api): handle MongoDB timeout on cold start

Refs #57"

# Quick one-liner (issue number in the subject line)
git commit -m "ci: add bandit security scan to backend workflow (#61)"
```

**In Pull Request descriptions**, always add a `Closes #N` line in the body — GitHub
renders a direct link to the issue and closes it automatically on merge:

```markdown
## Summary
- Add bandit static analysis to the backend CI job
- Configure HIGH severity threshold (`-ll`) to avoid noise

Closes #61
```

### Release flow and CHANGELOG

When you are ready to cut a release:

```bash
npm run release:dry     # preview changelog + version bump without writing
npm run release         # patch bump (interactive)
npm run release:minor   # minor bump
npm run release:major   # major bump
```

`release-it` will:
1. Bump the version in all `package.json` files and `pyproject.toml`
2. Generate / append to `CHANGELOG.md` from conventional commit messages
3. Create an annotated git tag `vX.Y.Z`
4. Push the tag — which triggers `ci.yml` and creates the GitHub Release automatically

---

## Python Code Quality

The backend enforces five automated gates on every push:

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

## Pre-commit Hooks

`pre-commit` is already in the dev dependencies and mirrors the CI gates locally,
catching issues before they ever reach GitHub Actions.

### Setup (one-time, per machine)

```bash
cd services/security-api
uv sync --group dev       # installs pre-commit into the venv
uv run pre-commit install # registers the hook in .git/hooks/pre-commit
```

Then create `.pre-commit-config.yaml` at the **repo root**:

```yaml
repos:
  - repo: https://github.com/psf/black
    rev: 24.10.0
    hooks:
      - id: black
        language_version: python3.11
        files: ^services/security-api/

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.9
    hooks:
      - id: ruff
        args: [--fix]
        files: ^services/security-api/

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.11.2
    hooks:
      - id: mypy
        files: ^services/security-api/app/
        additional_dependencies: [types-requests]

  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.10
    hooks:
      - id: bandit
        args: [-ll]
        files: ^services/security-api/app/
```

### Daily usage

```bash
# Run all hooks against every file (useful after first install)
uv run pre-commit run --all-files

# Run a single hook
uv run pre-commit run black

# Bump all hook versions to latest
uv run pre-commit autoupdate
```

Once installed, every `git commit` runs the hooks automatically.
A failing hook blocks the commit and shows exactly what to fix.

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
