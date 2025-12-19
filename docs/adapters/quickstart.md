# Summit Adapter SDK Quickstart

This guide shows the golden path to scaffold, test, package, and verify an adapter using the new SDK.

## Prerequisites

- Node.js 18+
- `pnpm install`
- Cosign available in PATH if you want real signatures (placeholder signing is provided by default).

## Commands

```bash
# Scaffold a webhook sink adapter
pnpm --filter @intelgraph/adapter-sdk exec summit-adapter init webhook-sink

# Run contract tests for the SDK
pnpm --filter @intelgraph/adapter-sdk test

# Package a bundle (manifest + payload + signature placeholder)
pnpm --filter @intelgraph/adapter-sdk exec summit-adapter package \
  --source ./adapters/reference/webhook-sink \
  --manifest ./adapters/reference/webhook-sink/manifest.json \
  --out ./artifacts

# Verify the bundle before install
pnpm --filter @intelgraph/adapter-sdk exec summit-adapter verify \
  --bundle ./artifacts/webhook-sink-0.1.0
```

## What the SDK provides

- **Contracts** for `ingest`, `export`, `notary`, `identity`, `webhook` capabilities and lifecycle hooks.
- **Execution guardrails**: policy preflight, retries, timeouts, circuit breaker threshold, idempotency key slots.
- **Receipts**: decision, digests, retries, duration, and external call metadata.
- **Bundle tooling**: manifest schema, bundle builder, and verifier that rejects unsigned or malformed bundles.
- **CLI**: `init`, `package`, and `verify` commands to keep the golden path under 30 minutes.

## Next steps

- Implement capability-specific handlers in your adapter template.
- Add SBOM and SLSA artifacts and wire a real cosign signer.
- Publish bundles to the registry bucket and surface them in Switchboard.
