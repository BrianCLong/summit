# Disclosure Packager User Guide

The disclosure packager assembles tenant-scoped evidence bundles that include redacted audit trails, SBOM manifests, policy gate verdicts, and signed attestations. Operators can self-serve evidence for regulators without waiting on engineering handoffs.

## Launching an export

1. Navigate to **Disclosures** in the IntelGraph console.
2. Select the tenant slug and timeframe (up to 31 days). Time ranges outside the window are rejected.
3. Choose which artifacts to include. Audit trails, SBOMs, attestations, and policy reports are enabled by default.
4. (Optional) Provide a webhook URL. The API will POST the job status, checksum, and download URL when the bundle finishes.
5. Submit the export. Progress is shown in-app; large jobs stream to disk and stay within the p95 < 2 minute SLO for 10k events.

## Validating a bundle

- Every bundle is zipped, manifested, and signed with an HMAC-SHA256 claim set.
- Artifact checksums and the bundle digest are surfaced in the UI and through the `/disclosures/export/:id` API.
- Attestations are verified against collected artifact digests and warnings appear if anything is missing.
- Downloaded bundles contain:
  - `manifest.json` – claim set summary, Merkle root, and attestation metadata.
  - `claimset.json` – signature payload with tenant, window, artifact hashes, and warnings.
  - `artifacts/*.json` – selected export files (audit trail, SBOM, policy reports, attestations).

## API quick reference

| Endpoint                               | Description                                                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `POST /disclosures/export`             | Create an async job. Body requires `tenantId`, `startTime`, `endTime`, and optional `artifacts` + `callbackUrl`. |
| `GET /disclosures/export`              | List the most recent jobs for the requesting tenant.                                                             |
| `GET /disclosures/export/:id`          | Fetch job status, warnings, artifact counts, and checksum.                                                       |
| `GET /disclosures/export/:id/download` | Download the signed bundle when complete.                                                                        |
| `POST /disclosures/analytics`          | UI adoption + time-to-value instrumentation (`view` and `start` events).                                         |

All endpoints enforce tenant isolation via the `x-tenant-id` header and redact PII before generating audit artifacts.

## Operational guardrails

- Metrics: `disclosure_packager_duration_seconds`, `disclosure_packager_bundle_bytes`, and `disclosure_packager_events_total` exported to Prometheus.
- Alerting: Alertmanager routes `service="disclosure-packager"` notifications to `#mc-ops`.
- Policies: Admission control requires cosign verification labels on disclosure bundles before promotion.
- Evidence: Attach bundle manifests, signed checksums, and Grafana screenshots under `.evidence/` for Friday reviews.
