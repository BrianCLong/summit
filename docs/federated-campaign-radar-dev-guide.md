# Federated Campaign Radar Developer Guide

## Overview

Federated Campaign Radar (FCR) provides schema-validated, privacy-preserving signal ingestion
and clustering for cross-tenant campaign detection. The implementation is anchored in
schema validation, privacy budget enforcement, credential-aware scoring, and provenance
logging.

## Key Modules

- Schemas: `schemas/fcr/v1/fcr-*.schema.json`
- Services: `server/src/services/fcr/*.ts`
- Routes: `server/src/routes/federated-campaign-radar.ts`
- Provenance: `server/src/provenance/fcr-ledger.ts`
- Policies: `server/policies/fcr-*.rego`

## Local Workflow

1. Configure a tenant privacy budget:

   ```bash
   curl -X POST http://localhost:4000/api/fcr/budget \
     -H 'Content-Type: application/json' \
     -d '{"tenant_id":"tenant-a","epsilon":10,"delta":0.1}'
   ```

2. Ingest signals:

   ```bash
   curl -X POST http://localhost:4000/api/fcr/ingest \
     -H 'Content-Type: application/json' \
     -d @fixtures/fcr-sample.json
   ```

3. Run the full pipeline:
   ```bash
   curl -X POST http://localhost:4000/api/fcr/run \
     -H 'Content-Type: application/json' \
     -d @fixtures/fcr-sample.json
   ```

## Validation

Schema validation uses Ajv with formats enabled. Signals must conform to the
`fcr-signal.schema.json` contract. Any validation errors will return HTTP 422 with
error details.

## Governance and Compliance

Privacy budgets are enforced in the FCR service layer and mirrored in policy-as-code
artifacts under `server/policies/`. Provenance entries are written for ingest, clustering,
and alert generation to support audit replay.
