# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS frontend-builder

ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"

WORKDIR /build/frontend

RUN corepack enable

COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm build


FROM ghcr.io/astral-sh/uv:python3.13-trixie-slim AS runtime

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY app ./app
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin moviemind
USER moviemind

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
