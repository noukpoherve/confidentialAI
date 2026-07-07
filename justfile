set shell := ["bash", "-cu"]

ROOT     := justfile_directory()
API_DIR  := ROOT / "services/security-api"
EXT_DIR  := ROOT / "apps/browser-extension"
DASH_DIR := ROOT / "apps/admin-dashboard"
DOCKER   := ROOT / "infra/docker"

# Show available recipes
default:
    @just --list

# ── Setup ─────────────────────────────────────────────────────────────────────

# Copy .env.example files (run once on a fresh clone)
setup-env:
    @if [ ! -f "{{API_DIR}}/.env" ]; then \
        cp "{{API_DIR}}/.env.example" "{{API_DIR}}/.env"; \
        echo "Created services/security-api/.env — edit it before starting the API"; \
    else \
        echo "services/security-api/.env already exists, skipped"; \
    fi
    @if [ ! -f "{{DASH_DIR}}/.env.local" ]; then \
        cp "{{DASH_DIR}}/.env.example" "{{DASH_DIR}}/.env.local"; \
        echo "Created apps/admin-dashboard/.env.local — edit it before starting the dashboard"; \
    else \
        echo "apps/admin-dashboard/.env.local already exists, skipped"; \
    fi

# Install all Node dependencies (root + dashboard + extension)
install:
    npm install
    npm install --prefix "{{DASH_DIR}}"
    npm install --prefix "{{EXT_DIR}}"

# Install Python dependencies for the API (requires uv)
install-api:
    cd "{{API_DIR}}" && uv python pin 3.13 && uv sync --group dev

# Download the optional spaCy French model (skip if SPACY_ENABLED=false)
spacy:
    cd "{{API_DIR}}" && uv run python -m spacy download fr_core_news_sm

# Full first-time setup: env files + all dependencies
bootstrap: setup-env install install-api
    @echo ""
    @echo "Bootstrap done. Edit .env files, then run: just dev"

# ── Infrastructure ────────────────────────────────────────────────────────────

# Start MongoDB and Qdrant (Docker)
db:
    docker compose -f "{{DOCKER}}/docker-compose.yml" up -d

# Start MongoDB only
db-mongo:
    docker compose -f "{{DOCKER}}/docker-compose.yml" up mongo -d

# Stop all Docker services
db-down:
    docker compose -f "{{DOCKER}}/docker-compose.yml" down

# ── Backend ───────────────────────────────────────────────────────────────────

# Start the FastAPI backend (uv)
api:
    cd "{{API_DIR}}" && uv run uvicorn app.main:app --reload --port 8080

# Start the FastAPI backend (pip/venv fallback)
api-pip:
    cd "{{API_DIR}}" && source .venv/bin/activate && uvicorn app.main:app --reload --port 8080

# ── Browser extension ─────────────────────────────────────────────────────────

# Build the extension for Chrome (dev mode — load unpacked in chrome://extensions)
ext-build:
    npm run build:extensions:chrome --prefix "{{EXT_DIR}}"

# Build the extension for all browsers (chrome / firefox / edge)
ext-build-all:
    npm run build:extensions --prefix "{{EXT_DIR}}"

# Watch CSS changes during extension development
ext-watch-css:
    npm run watch:css --prefix "{{EXT_DIR}}"

# ── Admin dashboard ───────────────────────────────────────────────────────────

# Start the Next.js dashboard in development mode
dashboard:
    npm run dev --prefix "{{DASH_DIR}}"

# ── Tests ─────────────────────────────────────────────────────────────────────

# Run all tests (API + extension)
test: test-api test-ext

# Run Python API tests (pytest)
test-api:
    cd "{{API_DIR}}" && uv run pytest

# Run extension unit tests (vitest)
test-ext:
    npm test --prefix "{{EXT_DIR}}" -- --run

# Run extension tests with coverage
test-ext-cov:
    npm run test:coverage --prefix "{{EXT_DIR}}"

# ── Release ───────────────────────────────────────────────────────────────────

# Preview the next release (dry run — nothing is written)
release-dry:
    npm run release:dry

# Create a patch release interactively
release:
    npm run release

# ── Aliases ───────────────────────────────────────────────────────────────────

# Alias: start the full stack (same as dev)
start: dev

# Alias: start the API server only
start-api: api

# Alias: start the dashboard only
start-dashboard: dashboard

# Alias: start the database only
start-db: db

# Stop all running services (Docker)
stop: db-down

# ── Dev (combined) ────────────────────────────────────────────────────────────

# Start the full stack: MongoDB + API + dashboard (extension must be loaded manually)
dev:
    #!/usr/bin/env bash
    just db
    echo "MongoDB started."
    echo "Starting API on http://localhost:8080 ..."
    cd "{{API_DIR}}" && uv run uvicorn app.main:app --reload --port 8080 &
    API_PID=$!
    echo "Starting dashboard on http://localhost:3000 ..."
    cd "{{DASH_DIR}}" && npm run dev &
    DASH_PID=$!
    echo ""
    echo "Stack running:"
    echo "  API       → http://localhost:8080/docs"
    echo "  Dashboard → http://localhost:3000"
    echo ""
    echo "Press Ctrl+C to stop all services."
    trap "kill $API_PID $DASH_PID 2>/dev/null; just db-down" INT TERM
    wait
