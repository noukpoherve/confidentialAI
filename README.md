# confidential-Agent

[![Frontend](https://github.com/noukpoherve/confidentialAI/actions/workflows/frontend.yml/badge.svg)](https://github.com/noukpoherve/confidentialAI/actions/workflows/frontend.yml)
[![Backend](https://github.com/noukpoherve/confidentialAI/actions/workflows/backend.yml/badge.svg)](https://github.com/noukpoherve/confidentialAI/actions/workflows/backend.yml)
[![Release](https://github.com/noukpoherve/confidentialAI/actions/workflows/release.yml/badge.svg)](https://github.com/noukpoherve/confidentialAI/actions/workflows/release.yml)

Monorepo for a user-side DLP (Data Loss Prevention) guardrail for generative AI platforms (ChatGPT, Claude, Gemini, and others).

Prompts are intercepted before submission, analyzed for risk, and acted on (`ALLOW`, `ANONYMIZE`, `BLOCK`, `WARN`). Incidents are logged and surfaced in an admin dashboard.

---

## Repository structure

```
confidential-Agent/
├── apps/
│   ├── browser-extension/   # Chrome MV3 extension
│   └── admin-dashboard/     # Next.js dashboard
├── services/
│   └── security-api/        # FastAPI backend
├── packages/
│   └── shared-types/        # Shared TypeScript contracts
├── infra/
│   └── docker/              # docker-compose (MongoDB + Qdrant)
├── docs/                    # Project documentation
└── scripts/
    └── sync-versions.js     # Propagates version across all packages
```

---

## Installation

### Prerequisites

Install the following tools before cloning:

| Tool                             | Version     | Install                                                       |
| -------------------------------- | ----------- | ------------------------------------------------------------- |
| [just](https://just.systems)     | any         | `brew install just`                                           |
| Node.js                          | 20+         | `brew install node`                                           |
| Python                           | 3.11 – 3.13 | `brew install python`                                         |
| [uv](https://docs.astral.sh/uv/) | any         | `brew install uv`                                             |
| Docker                           | any         | [docker.com](https://www.docker.com/products/docker-desktop/) |

> Docker is required for MongoDB. Qdrant (vector search) is optional.

---

### Option A — with `just` (recommended)

`just` automates every step. Run the commands below in order.

**1. Clone the repository**

```bash
git clone https://github.com/noukpoherve/confidentialAI.git
cd confidentialAI
```

**2. First-time bootstrap** — copies `.env` files and installs all dependencies

```bash
just bootstrap
```

This runs in sequence:

- `just setup-env` → copies `.env.example` files for the API and dashboard
- `just install` → `npm install` at root, dashboard, and extension
- `just install-api` → `uv python pin 3.13 && uv sync --group dev`

**3. Edit the environment files** — required before starting anything

```
services/security-api/.env        ← MongoDB URL, LLM API keys, optional Qdrant config
apps/admin-dashboard/.env.local   ← NEXTAUTH_SECRET, API base URL
```

**4. (Optional) Download the spaCy French model**

Used for `LEGAL_HR` phrase detection. Skip if `SPACY_ENABLED=false` in the API `.env`.

```bash
just spacy
```

**5. Start the full stack**

```bash
just start
```

Starts MongoDB (Docker), the FastAPI backend, and the Next.js dashboard in one command.
Press `Ctrl+C` to stop everything cleanly. To stop only Docker services: `just stop`.

**6. Build and load the browser extension**

```bash
just ext-build   # builds into apps/browser-extension/dist/chrome/
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `apps/browser-extension`
4. Open the extension options → set **API base URL** to `http://localhost:8080` if needed

---

### Option B — manually (without `just`)

**1. Clone and install Node dependencies**

```bash
git clone https://github.com/noukpoherve/confidentialAI.git
cd confidentialAI
npm install
npm install --prefix apps/admin-dashboard
npm install --prefix apps/browser-extension
```

**2. Copy environment files**

```bash
cp services/security-api/.env.example services/security-api/.env
cp apps/admin-dashboard/.env.example apps/admin-dashboard/.env.local
```

Edit both files before continuing.

**3. Start MongoDB with Docker**

```bash
docker compose -f infra/docker/docker-compose.yml up -d
# MongoDB only (without Qdrant):
# docker compose -f infra/docker/docker-compose.yml up mongo -d
```

**4. Install Python dependencies and start the API**

With `uv` (recommended):

```bash
cd services/security-api
uv python pin 3.13
uv sync --group dev
uv run python -m spacy download fr_core_news_sm   # optional
uv run uvicorn app.main:app --reload --port 8080  # start server
```

Without `uv` (pip fallback):

```bash
cd services/security-api
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e .
python -m spacy download fr_core_news_sm   # optional
uvicorn app.main:app --reload --port 8080
```

**5. Build and load the browser extension**

```bash
cd apps/browser-extension
npm run build:extensions:chrome
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `apps/browser-extension`
4. Open the extension options → set **API base URL** to `http://localhost:8080` if needed

**6. Start the dashboard**

```bash
cd apps/admin-dashboard
npm install
npm run dev
```

Open `http://localhost:3000`. Available routes:

| Route | Description |
|---|---|
| `http://localhost:3000` | Home |
| `http://localhost:3000/incidents` | Incidents |
| `http://localhost:3000/site-health` | Site health (telemetry) |
| `http://localhost:3000/en/dashboard/test-runner` | Visual test runner |

---

### Running services

| Service                          | URL                                              |
| -------------------------------- | ------------------------------------------------ |
| API                              | `http://localhost:8080`                          |
| API docs (Swagger)               | `http://localhost:8080/docs`                     |
| API health check                 | `http://localhost:8080/health`                   |
| Dashboard — home                 | `http://localhost:3000`                          |
| Dashboard — incidents            | `http://localhost:3000/incidents`                |
| Dashboard — site health          | `http://localhost:3000/site-health`              |
| Dashboard — visual test runner   | `http://localhost:3000/en/dashboard/test-runner` |
| Qdrant (if enabled)              | `http://localhost:6333/dashboard`                |

---

## Testing

### With `just`

```bash
just test             # run all tests (API + extension)
just test-api         # Python tests only (pytest)
just test-ext         # Extension unit tests only (vitest)
just test-ext-cov     # Extension tests with coverage report
```

### Manually

```bash
# API tests
cd services/security-api
uv run pytest

# Extension tests
cd apps/browser-extension
npm test -- --run

# Extension tests with coverage
npm run test:coverage
```

---

## All `just` commands

### Setup

```
just bootstrap        # First-time setup: copy .env files + install all dependencies
just setup-env        # Copy .env.example files only
just install          # Install Node dependencies (root + dashboard + extension)
just install-api      # Install Python dependencies via uv
just spacy            # Download optional spaCy French model
```

### Start / Stop

```
just start            # Start full stack: MongoDB + API + dashboard  ← main command
just start-api        # Start the API server only
just start-dashboard  # Start the dashboard only
just start-db         # Start the database only (MongoDB + Qdrant)
just stop             # Stop all Docker services

just dev              # Same as start (underlying recipe)
just api              # Same as start-api (underlying recipe)
just dashboard        # Same as start-dashboard (underlying recipe)
just api-pip          # Start the API using pip/venv instead of uv
just db               # Start MongoDB + Qdrant (Docker)
just db-mongo         # Start MongoDB only (without Qdrant)
just db-down          # Stop all Docker services
```

### Extension

```
just ext-build        # Build Chrome extension (then load unpacked in chrome://extensions)
just ext-build-all    # Build for Chrome + Firefox + Edge
just ext-watch-css    # Watch CSS changes during extension development
```

### Tests

```
just test             # Run all tests (API + extension)
just test-api         # Run Python tests (pytest)
just test-ext         # Run extension unit tests (vitest)
just test-ext-cov     # Run extension tests with coverage report
```

### Release

```
just release-dry      # Preview next release without writing anything
just release          # Create a patch release interactively
```

---

## Documentation

| Document                                                             | Description                                   |
| -------------------------------------------------------------------- | --------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                         | System architecture and agent pipeline        |
| [docs/IMPLEMENTATION_GUIDE.md](docs/IMPLEMENTATION_GUIDE.md)         | Implementation details and design decisions   |
| [docs/ENGINEERING_STANDARDS.md](docs/ENGINEERING_STANDARDS.md)       | Code standards and conventions                |
| [DEVOPS.md](DEVOPS.md)                                               | CI/CD pipelines, deployment, required secrets |
| [.github/BRANCH_STRATEGY.md](.github/BRANCH_STRATEGY.md)             | Branching model and merge rules               |
| [CHANGELOG.md](CHANGELOG.md)                                         | Release history (auto-generated)              |
| [services/security-api/README.md](services/security-api/README.md)   | API environment variables and configuration   |
| [apps/browser-extension/README.md](apps/browser-extension/README.md) | Extension build and release                   |
| [apps/admin-dashboard/README.md](apps/admin-dashboard/README.md)     | Dashboard setup and routes                    |
