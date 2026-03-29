# Render Deployment: Dedicated Relay Architecture

This guide deploys relay as a separate hosted service on Render.

## Target Architecture

- `zkshield-relay` (dedicated relay service)
- `zkshield-gateway` (verification + session service)
- `zkshield-redis` (session/replay state)
- `zkshield-frontend` (public UI)

## 1. Prerequisites

- Code pushed to GitHub.
- Render account connected to repository.
- Fresh secret generated:
  - `openssl rand -hex 64`

## 2. Blueprint Deploy (Fastest)

1. In Render dashboard, click `New` -> `Blueprint`.
2. Select this repo.
3. Render will detect `render.yaml`.
4. Create all services.

## 3. Set Required Environment Variables

After initial creation, set these values in Render dashboard:

### Relay service: `zkshield-relay`

- `ZKSHIELD_FORWARD_SIGNING_KEY` = same shared secret as gateway
- `ZKSHIELD_RELAY_ALLOWED_HOSTS` = comma-separated destination hosts you allow
  - Example: `receiver.internal.example.com,api.partner.com`

### Gateway service: `zkshield-gateway`

- `ZKSHIELD_FORWARD_SIGNING_KEY` = same shared secret as relay
- `ZKSHIELD_RELAY_URL` = relay internal URL + `/forward`
  - Find relay internal URL in Render service settings
  - Example: `http://zkshield-relay:5100/forward` or provided internal URL format from Render

### Frontend service: `zkshield-frontend`

- `ZKSHIELD_GATEWAY_AUTH_URL` = gateway public or internal reachable URL ending with `/auth`
- `ZKSHIELD_GATEWAY_PACKET_URL` = gateway public or internal reachable URL ending with `/packet`
- `ZKSHIELD_GATEWAY_HEALTH_URL` = gateway public or internal reachable URL ending with `/health`

## 4. Important Routing Choice

Choose one of these options for frontend -> gateway access:

1. Public gateway URL (simpler):
   - Make gateway public and firewall/rate-limit aggressively.
2. Private gateway URL (safer):
   - Keep gateway private and ensure frontend can use Render internal networking.

For deadline-first deployment, use option 1 first, then harden to option 2.

## 5. Verify Deployment

Check each endpoint:

- Relay: `/health`
- Gateway: `/health`
- Frontend: `/api/workflow/status`

Then run one auth+send flow from UI.

## 6. Destination Rule (Critical)

In UI `destination` field, host must be listed in `ZKSHIELD_RELAY_ALLOWED_HOSTS`.

- If destination URL is `https://receiver.internal.example.com/ingest`
- Allowlist must include `receiver.internal.example.com`

## 7. Security Checklist

- Do not use wildcard `*` allowlist.
- Rotate shared signing key before production launch.
- Keep relay and gateway in same region.
- Restrict gateway exposure where possible.
- Enable request logging and alerting in Render.
