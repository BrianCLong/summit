# Runbook: Living Architecture Flows

## Generate artifacts

```bash
pnpm summit flows generate --workspace . --out docs/architecture/flows
```

## Verify coverage and workflow consistency

```bash
pnpm summit flows verify --workspace . --out docs/architecture/flows
```

## Build agent context pack

```bash
pnpm summit flows pack --flows-out docs/architecture/flows --out .summit/context/flows.pack.json
```

## Drift handling

1. Re-run generation and verification locally.
2. Compare `flows.json` and `verification.json` deltas.
3. If endpoint coverage regresses, inspect new OpenAPI paths.
4. If workflow mismatch appears, inspect `.asl.json` terminal states and expected final event metadata.
