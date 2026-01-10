# MVP-4 GA Demo Script (3–5 minutes)

## Pre-demo setup

- Prereqs: Docker Desktop/Engine running, Node.js 20.11.0, pnpm installed.
- Repo root: `/Users/brianlong/Developer/summit`.
- `.env` present: `cp .env.example .env`.

## Demo flow

### Step 1 — Sanity check the toolchain

Command:

```bash
npm run test:quick
```

Expected output:

- `Quick sanity check passed`

Talk track:

- “We start with a deterministic sanity check to prove the toolchain is usable.”
- “This mirrors the GA evidence index baseline step.”

If this fails:

- If `npm` or `node` is missing, install Node.js 20.11.0 and rerun.
- If dependencies are missing, run `make bootstrap` and retry.

### Step 2 — Validate local prerequisites

Command:

```bash
make dev-prereqs
```

Expected output:

- No errors; returns to prompt.

Talk track:

- “This checks Docker, Compose, curl, and the `.env` file so smoke checks are deterministic.”

If this fails:

- If Docker is not running, start Docker Desktop/Engine.
- If `.env` is missing, run `cp .env.example .env` and retry.

### Step 3 — Start the local stack

Command:

```bash
make dev-up
```

Expected output:

- `Starting dev stack with docker-compose.dev.yaml...`
- Docker compose service startup logs.

Talk track:

- “This is the MVP-4 GA local entrypoint: a reproducible stack based on the dev compose file.”

If this fails:

- If ports are in use, stop the conflicting process or run `make dev-down` first.
- If Docker build fails, confirm images can be pulled and retry.

### Step 4 — Run the deterministic smoke checks

Command:

```bash
make dev-smoke
```

Expected output:

- `Checking UI at http://localhost:3000 ...`
- `Checking Gateway health at http://localhost:8080/health ...`
- `Dev smoke checks passed.`

Talk track:

- “This verifies the UI and Gateway health endpoints, exactly as required by the GA checklist.”
- “The output is the observable evidence used in the GA evidence index.”

If this fails:

- If the UI is down, check container logs: `make logs`.
- If the gateway health endpoint fails, confirm service ports and retry after 30 seconds.

## End-state recap + CTA

- “We just demonstrated the GA gating flow: sanity check, prereq validation, stack start, and deterministic smoke verification.”
- “Next, capture the outputs in `docs/release/GA_EVIDENCE_INDEX.md` and proceed with `make ga` for full gating.”
