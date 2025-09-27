# PRER Service

The Pre-Registered Experiment Registry (PRER) service enables teams to lock A/B test
analysis plans before shipping variants. It exposes a REST API for preregistration,
experiment lifecycle management, tamper-evident exports, and guarded result
ingestion.

## Features

- Register experiments with hypotheses, metric definitions, stop rules, and analysis plans.
- Auto-generate classical power calculations for two-proportion tests.
- Lock preregistered hypotheses once an experiment starts; attempts to change them are
  rejected and added to the audit trail.
- Export preregistration bundles with SHA-256 digests for offline verification.
- Ingest experiment results while rejecting any metrics that were not preregistered.

## Running the service

```bash
cd services/prer
npm install
npm run dev
```

The service listens on `PORT` (defaults to `3000`).

## Key API routes

| Method | Route                           | Description |
| ------ | ------------------------------- | ----------- |
| POST   | `/experiments`                  | Create a preregistered experiment. |
| POST   | `/experiments/:id/start`        | Mark experiment as running and lock the plan. |
| PUT    | `/experiments/:id/hypothesis`   | Attempt to update the hypothesis (rejected once locked). |
| POST   | `/experiments/:id/export`       | Produce a cryptographically verifiable preregistration bundle. |
| POST   | `/experiments/:id/results`      | Ingest metric results (rejects unregistered metrics). |
| GET    | `/experiments/:id/audit`        | Retrieve the audit log. |

## Offline export verification

Each export returns the serialized preregistration document and its SHA-256 digest.
Offline verification simply recomputes the digest:

```bash
echo "<payload>" | shasum -a 256
```

Matching hashes confirm integrity and the recorded export timestamp provides temporal
anchoring for the preregistration record.
