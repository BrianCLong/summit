# Adapter quickstart

End-to-end checklist for building and shipping gateway adapters. Follow the lifecycle below: **init → run → test → package → push → install**.

## Prerequisites

- Node 18+, pnpm, and Docker (for any backing services your adapter talks to).
- `cosign` for bundle signing/verification and `tar` for packaging.
- Access to staging credentials (artifact bucket/registry and config values such as service URLs or API tokens).

## Adapter lifecycle

### 1) Init

1. Create a folder under `adapters/<adapter-name>/` and start from the existing gateway template:

   ```bash
   mkdir -p adapters/my-adapter
   cp adapters/entity-resolution/gateway-adapter.ts adapters/my-adapter/gateway-adapter.ts
   # Update gatewayPlugin.name/version + endpoints in the new file
   ```

2. Keep exports consistent with the other adapters: a `gatewayPlugin` object with `typeDefs`, `resolvers`, and a default export. If your adapter needs a client class (like `PolicyEngineAdapter`), export it from the same file.

3. Add any required environment variables to `.env.example` (dev-only values only). Avoid adding production secrets; reference `docs/SECURITY.md` for guardrails.

### 2) Run locally

1. Install deps once: `pnpm install`
2. Start the backend so the gateway auto-loads adapters from `adapters/*/gateway-adapter.ts`:

   ```bash
   pnpm --filter intelgraph-server dev
   ```

3. Hit the GraphQL playground (`http://localhost:4000/graphql`) and confirm your adapter’s queries/mutations resolve.

### 3) Test

1. Add Jest coverage under `server/tests/adapters/` that exercises your resolvers/client calls.
2. Run the focused suite while iterating:

   ```bash
   pnpm --filter intelgraph-server test -- adapters
   ```

3. Keep coverage ≥80% for new code and avoid committing `.only`/`.skip` tests.

### 4) Package (signed bundle)

1. Build a tarball that mirrors the `adapters/<adapter-name>/` contents:

   ```bash
   mkdir -p dist/adapters
   tar -czf dist/adapters/my-adapter.tgz -C adapters my-adapter
   sha256sum dist/adapters/my-adapter.tgz > dist/adapters/my-adapter.tgz.sha256
   ```

2. Sign the bundle so staging can verify provenance:

   ```bash
   cosign sign-blob --key ./keys/cosign.key \
     dist/adapters/my-adapter.tgz \
     --output-signature dist/adapters/my-adapter.tgz.sig
   ```

### 5) Push (artifact distribution)

1. Upload the `.tgz`, `.tgz.sig`, and `.tgz.sha256` files to the staging artifact bucket/registry you use for deploys.
2. Record the bundle URI and digest in your release notes or deployment ticket.

### 6) Install (staging)

Use the staging bootstrapper to verify the signature, expand the bundle, and apply configuration overrides:

```bash
scripts/adapters/deploy-to-staging.sh \
  --bundle dist/adapters/my-adapter.tgz \
  --signature dist/adapters/my-adapter.tgz.sig \
  --config path/to/adapter.config.yaml
```

Environment overrides:

- `COSIGN_PUB_KEY` – path to the public key used for verification (required).
- `INSTALL_DIR` – bundle install root (default: `/opt/summit/adapters`).
- `CONFIG_DIR` – where rendered configs are stored (default: `/etc/summit/adapters`).

## Troubleshooting

- **Signature verification fails:** confirm `COSIGN_PUB_KEY` points to the matching public key and the `.sig` file was uploaded intact; re-run `cosign verify-blob --key $COSIGN_PUB_KEY --signature <sig> <bundle>` locally.
- **Adapter not visible in GraphQL:** ensure the exported `gatewayPlugin.name` is unique and that the gateway process restarted after install. Watch the server logs for schema stitching errors.
- **Downstream service errors:** validate service URLs in your config file; for local runs, set env vars (e.g., `POLICY_ENGINE_URL=http://localhost:4040`) before `pnpm --filter intelgraph-server dev`.
- **Tests flake on external calls:** stub network calls in Jest and keep fixtures under `server/tests/fixtures/adapters/` to avoid hitting real services.

## Expected timings (healthy developer laptop)

- Init + template copy: **<1 minute**
- Local dev server boot with adapter loaded: **60–90 seconds** after dependencies are installed
- Focused adapter tests: **30–60 seconds**
- Package + sign: **<10 seconds**
- Staging deploy via `deploy-to-staging.sh`: **<1 minute** (primarily I/O and signature verification)
