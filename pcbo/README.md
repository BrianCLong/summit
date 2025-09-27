# Policy-Constrained Backfill Orchestrator (PCBO)

PCBO coordinates historical data backfills under strict consent, jurisdiction, and retention controls. It
combines a Go orchestration service with a TypeScript command-line interface to plan, dry-run, and execute
retroactive loads while emitting deterministic evidence.

## Components

- **Go orchestrator** (`cmd/pcbo-orchestrator`): exposes HTTP endpoints for planning, policy-gated dry runs, and
  live execution. Execution outputs include reconciliation reports, rollback manifests, and Merkle-based proofs.
- **TypeScript CLI** (`cli`): connects to the orchestrator and surfaces plan/dry-run/execute workflows directly
  from the terminal.

## Endpoints

| Endpoint        | Purpose                                                             |
| --------------- | ------------------------------------------------------------------- |
| `POST /v1/plan` | Returns the deterministic partition plan for a request.             |
| `POST /v1/dry-run` | Produces the add/omit diff per partition with policy explainability. |
| `POST /v1/execute` | Runs the backfill, blocks on policy breaches, and returns proofs.   |

Payloads include the historical records to ingest, existing target identifiers, and the policy configuration.
All timestamps are ISO-8601 strings.

## CLI Usage

```bash
# Install dependencies and build the CLI
yarn --cwd pcbo/cli install

# Dry-run a request located at request.json
node pcbo/cli/dist/index.js dry-run --input request.json --host localhost --port 8080

# Execute and write the response to disk
node pcbo/cli/dist/index.js execute --input request.json --output run-output.json
```

You can also invoke the packaged binary after building:

```bash
npm --prefix pcbo/cli install
npm --prefix pcbo/cli run build
pcbo/cli/dist/index.js plan --input request.json
```

### Request Skeleton

```json
{
  "runId": "retro-run-001",
  "dataset": "events",
  "start": "2024-01-01T00:00:00Z",
  "end": "2024-01-02T00:00:00Z",
  "chunkSeconds": 3600,
  "policies": {
    "requireConsent": true,
    "allowedJurisdictions": ["US", "CA"],
    "retentionCutoff": "2023-12-01T00:00:00Z"
  },
  "sourceRecords": [
    {
      "id": "rec-1",
      "occurredAt": "2024-01-01T00:15:00Z",
      "jurisdiction": "US",
      "consentGranted": true,
      "retentionExpiresAt": "2025-01-01T00:00:00Z"
    }
  ],
  "existingTargetIds": ["rec-legacy-1"],
  "metadata": {
    "initiator": "ops-team"
  }
}
```

## Proof Verification

Each executed partition emits a record count and Merkle root calculated over sorted identifiers. Offline
verification can recompute the root using the included `VerifyMerkleRoot` helper from the Go package or an
external tool that mirrors the hashing strategy.

## Testing

Run Go unit tests:

```bash
(cd pcbo && go test ./...)
```

The CLI can be type-checked and tested with:

```bash
npm --prefix pcbo/cli run build
npm --prefix pcbo/cli test
```
