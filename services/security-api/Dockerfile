# ─── Stage 1 : builder ────────────────────────────────────────────────────────
# Install dependencies in an isolated environment using uv
FROM python:3.11-slim AS builder

# Install uv (fast Python package manager)
RUN pip install --no-cache-dir uv

WORKDIR /app

# Copy dependency files first to leverage Docker layer caching
COPY pyproject.toml uv.lock ./

# Create virtual environment and install dependencies
RUN uv venv /app/.venv && \
    uv pip install --python /app/.venv/bin/python --no-cache -r pyproject.toml

# Download spaCy NER model into the venv
RUN /app/.venv/bin/python -m spacy download en_core_web_sm

# ─── Stage 2 : runtime ────────────────────────────────────────────────────────
# Lean final image without build tools
FROM python:3.11-slim AS runtime

# Create a non-root user for security best practices
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --no-create-home appuser

WORKDIR /app

# Copy only the built venv (not the build tools)
COPY --from=builder /app/.venv /app/.venv

# Copy application source code
COPY app/ ./app/

# Grant read access to the non-root user
RUN chown -R appuser:appgroup /app

USER appuser

# Expose the API port
EXPOSE 8080

# Use the venv and set Python runtime flags
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Start the server
# --workers 1: sufficient for Koyeb (scale horizontally when needed)
# --host 0.0.0.0: listen on all interfaces (required by Koyeb)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
