# syntax=docker/dockerfile:1.7

FROM python:3.13.14-slim-bookworm AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    VIRTUAL_ENV=/opt/venv

WORKDIR /build

RUN python -m venv "${VIRTUAL_ENV}"
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"

COPY pyproject.toml ./
COPY apps/api/engtrace ./apps/api/engtrace
COPY apps/worker/engtrace_worker ./apps/worker/engtrace_worker

# The package metadata references the repository README. A build-local placeholder
# keeps this layer independent of documentation-only changes in the build context.
RUN touch README.md \
    && python -m pip install --upgrade pip \
    && python -m pip install ".[postgres,telemetry]"

FROM python:3.13.14-slim-bookworm AS runtime

LABEL org.opencontainers.image.title="EngTrace API" \
      org.opencontainers.image.description="Industrial requirements intelligence API" \
      org.opencontainers.image.licenses="Apache-2.0"

ENV PATH="/opt/venv/bin:${PATH}" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UVICORN_HOST=0.0.0.0 \
    UVICORN_PORT=8000

RUN groupadd --gid 10001 engtrace \
    && useradd --uid 10001 --gid engtrace --no-create-home --shell /usr/sbin/nologin engtrace

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app
USER 10001:10001

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)" || exit 1

CMD ["uvicorn", "engtrace.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]
