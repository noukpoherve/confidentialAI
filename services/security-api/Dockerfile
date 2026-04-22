# ── Stage 1: build dependencies with uv ──────────────────────────────────────
FROM python:3.13-slim AS builder

WORKDIR /app

# Install uv (fast Python package manager)
RUN pip install --no-cache-dir uv

# Copy dependency files first — layer cached unless these change
COPY pyproject.toml uv.lock ./

# Install production dependencies into an isolated venv using the lockfile
# --frozen ensures exact versions from uv.lock (reproducible builds)
RUN uv sync --frozen --no-dev

# Download the spaCy model into the venv (not a PyPI package, installed separately)
RUN .venv/bin/python -m spacy download fr_core_news_sm

# ── Stage 2: minimal runtime image ───────────────────────────────────────────
FROM python:3.13-slim AS runtime

WORKDIR /app

# Non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Copy venv from builder (includes packages + spaCy model)
COPY --from=builder /app/.venv .venv

# Copy application code
COPY app/ app/

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

USER appuser

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
