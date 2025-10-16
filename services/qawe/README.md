# Quorum Approval Workflow Engine (QAWE)

QAWE is an Ed25519-signed quorum workflow service written in Go with a companion
React dashboard. It allows policy-defined voter groups to approve workflow gates
with explicit quorum requirements, stage expirations, delegation rules, and
parallel/conditional stage topologies.

## Features

- **Policy-aware quorums**: Each gate references a role whose principals are
  specified in the workflow definition. Delegation keys can be registered per
  principal and enforced per-gate.
- **Deterministic expiry handling**: Gates define per-activation expiry windows;
  approvals after the deadline are rejected and the workflow instance becomes
  `expired`.
- **Parallel and conditional stages**: Stages may fan out in parallel (all gates
  must complete) or route conditionally based on instance context.
- **Cryptographic evidence**: Every satisfied gate produces a server-signed
  approval bundle that can be verified offline with the exposed server public
  key.

## Running the service

```bash
cd services/qawe
# compile & run on :8080
go run ./cmd/qawe
```

Environment variables:

- `QAWE_SERVER_PRIVATE_KEY` (optional): base64-encoded Ed25519 private key.
  When omitted, the server generates an ephemeral key pair on startup.

## HTTP API

| Method | Path                            | Description                                       |
| ------ | ------------------------------- | ------------------------------------------------- |
| POST   | `/api/workflows`                | Register a workflow definition (policy included). |
| POST   | `/api/instances`                | Start a workflow instance with context.           |
| GET    | `/api/instances/{id}`           | Retrieve instance state.                          |
| POST   | `/api/instances/{id}/approvals` | Submit a signed approval payload.                 |
| GET    | `/api/info`                     | Return server public key for bundle verification. |

Approval payloads must be signed using the canonical message format:

```
{instanceID}|{stageID}|{gateID}|{actorID}|{delegatedFrom}|{signedAtUnixNanos}
```

## React Console

The UI lives in `ui/qawe` and can be started with:

```bash
cd ui/qawe
npm install
npm run dev
```

By default it proxies API requests to `http://localhost:8080`.
