# zkShield++ Frontend Dashboard

Next.js dashboard for the zkShield++ workflow.

## What is integrated

The UI is connected to real proof scripts through API routes:

- `GET /api/workflow` → list all workflow endpoints and quick-start payloads
- `GET /api/workflow/status` → check proof artifact availability + gateway reachability
- `POST /api/workflow/generate` → runs `../scripts/gen_proof.sh`
- `POST /api/workflow/verify` → runs `../scripts/verify_proof.sh`
- `POST /api/workflow/send` → loads generated proofs and forwards packet to gateway `/packet`

Each of these also supports `GET` at the same path to return route metadata and payload/response shape.

Pages:

- `/generate` triggers proof generation and shows logs + public inputs
- `/generate` also sends packet payload to gateway with generated proofs
- `/transfer` provides a dedicated packet transfer console (status + route map + send form)
- `/verify` triggers firewall verification and shows PASS/DROP

## Run locally

From repo root (one-time prerequisites):

```bash
source venv/bin/activate
```

From frontend directory:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Notes

- API routes run in Node runtime and spawn bash scripts in the repo root.
- Ensure required artifacts/keys exist (`zk-setup/`, `ml/ezkl/`, `proofs/`) before verification.
