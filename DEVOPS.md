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

| Secret              | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| `KOYEB_API_KEY`     | Koyeb → Account → API Keys                                                    |
| `KOYEB_SERVICE_ID`  | Koyeb → your service → copy from URL                                          |
| `VERCEL_TOKEN`      | vercel.com → Settings → Tokens                                                |
| `VERCEL_ORG_ID`     | vercel.com/account → Settings → Team ID                                       |
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

| Type       | When to use                                  |
| ---------- | -------------------------------------------- |
| `feat`     | New feature visible to users                 |
| `fix`      | Bug fix                                      |
| `perf`     | Performance improvement (no behavior change) |
| `refactor` | Code restructuring (no behavior change)      |
| `test`     | Adding or updating tests                     |
| `ci`       | Changes to CI/CD workflows                   |
| `chore`    | Tooling, deps, config (not shipped to users) |
| `docs`     | Documentation only                           |

### Linking to GitHub Issues

Add a footer to your commit message or PR description:

| Keyword        | Effect on merge to default branch           |
| -------------- | ------------------------------------------- |
| `Closes #42`   | Automatically closes issue #42              |
| `Fixes #42`    | Same — alternative spelling                 |
| `Resolves #42` | Same — alternative spelling                 |
| `Refs #42`     | Creates a link but does not close the issue |

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

## CI Enforcement Scenarios

The pipeline enforces four behaviors automatically once branch protection rules
are configured (see First-time Deployment Checklist → Step 5).

---

### Scenario 1 — Failing tests block the PR

| | |
|---|---|
| **Trigger** | Any push to a PR branch that touches `services/security-api/**` |
| **Workflow** | `backend.yml` |
| **Check name in GitHub** | `Backend (Python API)` |
| **Blocking condition** | Any pytest test exits non-zero |

When a test fails, the `Run tests with coverage (pytest)` step exits with
code 1. GitHub marks the required check as ❌ Failed and disables the
merge button with:

> _"Merge pull request — blocked by required status check."_

The full test failure output — file, line number, assertion details — is
visible under Actions → the failing run → `Run tests with coverage` step.
No reviewer can bypass this without disabling branch protection.

---

### Scenario 2 — Coverage below threshold blocks the PR

| | |
|---|---|
| **Trigger** | Same as Scenario 1 |
| **Workflow** | `backend.yml` |
| **Check name in GitHub** | `Backend (Python API)` |
| **Active threshold** | **68 %** (current baseline: 68.86%) |
| **Target threshold** | **70 %** — blocked by untested infrastructure modules (see below) |

The pytest command runs with `--cov-fail-under=68`. If overall coverage
of the `app/` package drops below the threshold, pytest exits with code 2
and the step summary shows:

```
FAIL Required test coverage of 68% not reached. Total coverage: 65%
```

The check fails and blocks the merge — same gate as Scenario 1, different
exit code. Adding new code without tests triggers this automatically.

**Current coverage breakdown (baseline run — 119 passed, 1 skipped):**

| Module | Coverage | Gap | Reason untested |
|---|---|---|---|
| `app/core/error_tracking.py` | 0% | 34 stmts | Sentry SDK — needs mock |
| `app/services/embedding_service.py` | 23% | 50 stmts | Requires OpenAI API key |
| `app/stores/vector_store.py` | 48% | 53 stmts | Requires running Qdrant |
| `app/core/site_signal_store.py` | 39% | 35 stmts | MongoDB store, partially mocked |
| `app/core/incident_store.py` | 40% | 33 stmts | MongoDB store, partially mocked |
| `app/agents/asi.py` | 33% | 12 stmts | Telegram notifications |

**To reach 70%:** 19 additional covered statements needed.
Covering `error_tracking.py` alone (with Sentry SDK mocks) would clear the gap.
Tracked in Possible Future Improvements below.

---

### Scenario 3 — All checks pass → merge becomes available

| | |
|---|---|
| **Trigger** | All required checks on the PR complete successfully |
| **Required checks** | `Backend (Python API)` · `Frontend (Dashboard + Extension)` |
| **Behavior** | Merge button becomes available to authorized reviewers |

Both checks must show ✅. A check is considered **skipped** (which counts
as passing) when no files in its `paths` filter were modified — pushing a
README change does not force a full backend CI run.

If the repository requires at least one review, the merge button remains
greyed out until a reviewer approves, even if all checks are green.

---

### Scenario 4 — Merge to main triggers automatic deployment

| | |
|---|---|
| **Trigger** | PR merged into `main` (a `push` event on `main`) |
| **Workflows** | `backend.yml` (conditional deploy steps) · `frontend.yml` (conditional deploy steps) |
| **Expected SLA** | Both deployments live within **10 minutes** of merge |

Deployment chain:

```
PR merged into main
        │
        ├─► backend.yml (if services/security-api/** changed)
        │       docker build → push to ghcr.io/.../security-api:latest
        │       POST /v1/services/{KOYEB_SERVICE_ID}/redeploy
        │       Koyeb pulls new image → swaps containers
        │
        └─► frontend.yml (if apps/** changed)
                vercel deploy --prod
                Vercel builds Next.js → publishes to production URL
```

The Koyeb redeploy is **asynchronous**: the workflow step triggers it
and confirms HTTP 2xx, but the actual container swap happens on Koyeb's
infrastructure. Monitor the real-time swap in Koyeb → Service → Deployments.

---

## How to Test Each Scenario

> These tests can be run on any non-protected branch — no need to touch `main`.
> Use `test/scenario-N` branches and open PRs targeting `develop`.

---

### Test Scenario 1 — Break a pytest test

```bash
# 1. Create an isolated branch
git checkout -b test/scenario-1-failing-test

# 2. Add a deliberately failing test
cat >> services/security-api/tests/test_ci_gate.py << 'EOF'
def test_intentional_failure():
    """Verify that CI blocks merge on test failure — delete after validating."""
    assert False, "Intentional failure: Scenario 1 validation"
EOF

# 3. Commit and push
git add services/security-api/tests/test_ci_gate.py
git commit -m "test: intentional failure to verify CI blocking (Scenario 1)"
git push origin test/scenario-1-failing-test
```

**Open a PR** targeting `develop`. Go to the PR → **Checks** tab.

✅ Expected result:
- `Backend (Python API)` → ❌ Failed
- Step `Run tests with coverage (pytest)` shows the assertion error
- Merge button is disabled

**Cleanup:** delete `test_ci_gate.py`, push, verify the check turns ✅, close the PR.

---

### Test Scenario 2 — Drop coverage below 70%

```bash
# 1. Create an isolated branch
git checkout -b test/scenario-2-drop-coverage

# 2. Add a module with zero test coverage
mkdir -p services/security-api/app/utils
cat > services/security-api/app/utils/uncovered.py << 'EOF'
# Module with no tests — drops overall coverage below threshold
def complex_logic(x: int) -> int:
    if x > 100:
        return x * 2
    elif x > 50:
        return x + 10
    else:
        return x - 5
EOF

# 3. Commit and push
git add services/security-api/app/utils/uncovered.py
git commit -m "test: uncovered module to verify coverage gate (Scenario 2)"
git push origin test/scenario-2-drop-coverage
```

**Open a PR** targeting `develop`.

✅ Expected result:
- `Backend (Python API)` → ❌ Failed
- Step summary shows: `FAIL Required test coverage of 70% not reached.`
- Merge button is disabled

**Cleanup:** either add tests for `uncovered.py` or delete the file, push, verify coverage rises above 70%.

---

### Test Scenario 3 — All checks pass

```bash
# 1. Create a clean PR branch
git checkout -b test/scenario-3-all-pass

# 2. Make a valid, tested change (or just update a comment)
# Example: update a docstring in an existing file
git add .
git commit -m "test: clean commit to verify full CI pass (Scenario 3)"
git push origin test/scenario-3-all-pass
```

**Open a PR** targeting `develop`. Wait for all checks to complete.

✅ Expected result:
- `Backend (Python API)` → ✅ Passed (or ⏭ Skipped if no backend files changed)
- `Frontend (Dashboard + Extension)` → ✅ Passed (or ⏭ Skipped if no frontend files changed)
- Merge button is **available** (green) for an authorized reviewer

---

### Test Scenario 4 — Deployment on merge to main

> ⚠️ This test requires valid Koyeb and Vercel secrets to be configured.
> Only run this on a real merge to `main` — not on a test branch.

```bash
# 1. Merge a passing PR into main via the GitHub UI (not via CLI to respect checks)
# 2. Go to GitHub → Actions → filter by branch "main"
```

**Monitor both workflows:**

| Workflow | Steps to verify | Expected |
|---|---|---|
| `Backend` | `Build and push Docker image` | ✅ image pushed to GHCR |
| `Backend` | `Deploy to Koyeb` | ✅ HTTP 2xx response |
| `Frontend` | `Deploy dashboard — Production (main)` | ✅ Vercel deploy URL in step summary |

**Verify the live services:**

```bash
# API health check
curl https://your-service.koyeb.app/health
# Expected: {"status": "ok", ...}

# Dashboard (open in browser)
open https://your-dashboard.vercel.app
```

✅ Expected result: both services reflect the merged changes within 10 minutes.

If the `Deploy to Koyeb` step returns HTTP 2xx but the service is slow to swap,
monitor in real time at: **Koyeb → your service → Deployments tab**.

---

## Possible Future Improvements

- [ ] **Slack / Discord notifications** on deployment failure
- [ ] **Health checks** — verify the API responds after deploy before marking success
- [ ] **Automatic rollback** — revert to previous image if health check fails
- [ ] **Staging environment** — deploy `develop` to a Koyeb staging service before `main`
- [ ] **Dependabot** — automated dependency updates
- [ ] **mypy gate** — uncomment the mypy step in `backend.yml` once type annotations are complete
- [ ] **Vitest coverage** — add `@vitest/coverage-v8` to the extension for HTML/XML reports
- [x] **pytest coverage gate** — active at 68% (`--cov-fail-under=68`), baseline 68.86%
- [ ] **Raise coverage threshold to 70%** — 19 statements needed; priority targets:
  `error_tracking.py` (0%, mock Sentry SDK) · `asi.py` (33%, mock Telegram) · `incident_store.py` (40%)
