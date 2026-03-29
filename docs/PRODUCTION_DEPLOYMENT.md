# Production Deployment Guide

## 1. Prerequisites

- Docker and Docker Compose plugin
- Valid proof artifacts in `zk-setup/` and `ml/ezkl/`
- `.env` file created from `.env.example`

## 2. Environment Configuration

1. Copy template:
   - `cp .env.example .env`
2. Set required values:
   - `ZKSHIELD_FORWARD_SIGNING_KEY`
   - `ZKSHIELD_RELAY_ALLOWED_HOSTS` (explicit comma-separated hosts, no wildcard)
   - `ZKSHIELD_REDIS_URL`
   - `ZKSHIELD_RELAY_URL`

## 3. Build and Start

1. Build images:
   - `docker compose build`
2. Start stack:
   - `docker compose up -d`
3. Check health:
   - `docker compose ps`
   - `curl http://127.0.0.1:5001/health`
   - `curl http://127.0.0.1:5100/health`
   - `curl http://127.0.0.1:3000/api/workflow/status`

## 4. Startup Commands (without Docker)

Gateway:
- `gunicorn gateway.gateway:app --bind 0.0.0.0:5001 --workers 2 --threads 4 --timeout 120`

Relay:
- `gunicorn relay.proxy:app --bind 0.0.0.0:5100 --workers 2 --threads 4 --timeout 120`

Frontend:
- `cd frontend && npm run build && npm run start`

Redis:
- `redis-server --port 6379`

## 5. Concurrent Smoke Test

1. Start an example destination receiver:
   - `python3 scripts/demo_receiver.py`
2. Run smoke test:
   - `python3 scripts/smoke_concurrent.py --gateway-base http://127.0.0.1:5001 --destination http://127.0.0.1:7000/ingest --count 10 --workers 10`

Expected:
- Final summary reports `failed=0`.

## 6. Production Checklist

- Required env vars are set (no secret fallbacks).
- Relay host allowlist is explicit and minimal.
- Redis persistence/backup policy is configured for session durability requirements.
- TLS termination is configured in front of public endpoints.
- Logs/metrics are centralized.
