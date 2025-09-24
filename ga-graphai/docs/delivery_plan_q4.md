# Demo-Ready Delivery Plan

This plan sequences the remaining work that enables the connectors-first demo, provenance verification, predictive alpha experiments, and the publication soft gate. Each workstream is scoped so it can land in this iteration without blocking others.

## 1. Connector Catalog (Wave 1)

1. **Define manifest schema** inside `prov-ledger` so every connector shares the same contract (metadata, auth, rate limits, license posture, fixtures) without relying on shared `common-types` exports.
2. **Author manifests** for the twelve must-have connectors under `policy/config/connectors`. Include acceptance metadata: fixtures, schema mapper hints, PII annotations, throttling.
3. **Implement catalog helpers** in the policy package to load, validate, and query connector manifests.
4. **Add golden IO tests** that load each manifest, assert required fields, and pin fixture checksums so the demo can be replayed.

### Wave 2 (Next Tranche)

- **AbuseIPDB (enrichment)** – BYO API key with quota-aware caching and consensus scoring alongside VirusTotal.
- **CISA KEV (compliance)** – Nightly mirror of KEV catalog with remediation SLA tracking.
- **HIBP (breach enrichment)** – Enterprise credential exposure checks with masked email handling.
- **AlienVault OTX (threat intel)** – Pulse ingestion with contributor privacy controls and taxonomy mapping.
- **urlscan.io (phishing evidence)** – Cached screenshot/DOM artifacts for phishing verification.
- **MISP feed importer (threat intel)** – Read-only sync of curated MISP events with tag preservation and multi-org isolation.

Each wave-two manifest carries go-live dependencies, owner teams, and demo narratives so we can stage enablement with customers who bring the required licenses.

## 2. Provenance Ledger (UI + CLI)

1. **Extend ledger types** with a manifest bundle (`artifacts`, `transforms`, `policy`, `signatures`).
2. **Add export helpers** in `prov-ledger` so the UI can render signer details, selective disclosure status, and unverifiable warnings.
3. **Implement CLI (`intelgraph-verify`)** in Go. Inputs: bundle directory path. Validates schema, recomputes Merkle root, verifies transform digests, checks signatures, emits JSON when `--machine` is supplied.
4. **Backfill tests** in both TypeScript and Go to ensure manifest verification covers tamper/no-sig/unverifiable cases.

## 3. Predictive Alpha Scenarios

1. **Indicator Trend Forecast API**: FastAPI endpoint that ingests daily counts per source, produces ETS-style forecast, and supports what-if exclusion toggles.
2. **Community Risk Drift API**: Accepts community telemetry (sanctions proximity, infra churn, connectivity) and returns a risk timeline plus forecast.
3. **Model utilities** live in `graphai/src/forecasts.py` with unit coverage; endpoints surface MAE + what-if deltas for the UI.

## 4. Publication Soft Gate

1. **Define checklist + audit types** describing citations, manifests, and user rationale.
2. **Create evaluation helper** (`policy/src/publish.ts`) that scores a submission, emits soft-gate recommendations, and records the attempt through the ledger interface.
3. **Add tests** for pass/recommend/tampered states and make sure audit logs include missing artifacts with reason text.

## 5. Integration + Demo Readiness

1. Wire UI helpers in `web/src/manifestView.ts` to format manifest details, selective disclosure toggles, and inline warnings.
2. Update packages to export new helpers and ensure TypeScript projects compile with the new types.
3. Run the full test suite across affected packages plus `go test ./...` for the CLI to leave the tree green.

Delivery order: connectors → common types → provenance → predictive → soft gate → UI wiring → CLI verification → final regression tests.
