# Public Trust Dashboards

**Status:** Draft
**Version:** 1.0
**Owner:** Trust Engineering

## Goal

Radical transparency without operational risk. The public trust dashboard provides a real-time (or near real-time) view into the health and trustworthiness of the Summit platform, derived exclusively from sanitized CI artifacts.

## Design Principles

1.  **Read-Only:** The dashboard is a static site or read-only view. It cannot modify system state.
2.  **Disconnected:** No direct connection to production databases or internal APIs.
3.  **Sanitized:** All data is pre-processed and sanitized before being exposed.
4.  **Evidence-Backed:** Every metric can be traced back to a cryptographically verifiable artifact (e.g., a signed JSON blob from a GitHub Action run).

## Dashboard Sections

### 1. Build & Release Health

- **Current Stable Version:** The latest GA release tag.
- **CI Status:** Pass/Fail status of the latest build on `main`.
- **Build Latency:** Trendline of CI build times.
- **Reproducibility:** Badge indicating if the latest release is SLSA Level 3 compliant.

### 2. Security & Compliance

- **Policy Compliance:** % of OPA policies passing.
- **Vulnerability Status:** Summary of CVE scan results (e.g., "0 Critical, 0 High").
- **SBOM Availability:** Link to the Software Bill of Materials for the latest release.
- **Signature Verification:** Instructions/badge for verifying release signatures.

### 3. Reliability History (Lagged)

- **Uptime (Last 30 Days):** Synthetic uptime metric derived from external probes.
- **Incident Summary:** Count of public-facing incidents in the last 90 days.
- **Post-Mortems:** Links to public post-mortem reports for past incidents.

## Implementation Architecture

1.  **CI Exporter:** A GitHub Action workflow runs on every merge/release.
    - Collects metrics (test results, scan reports, build times).
    - Sanitizes the data (removes internal logs, user IDs, etc.).
    - Generates a `trust-snapshot.json` adhering to `trust/trust-snapshot.schema.json`.
    - Signs the snapshot with the release key.
2.  **Publication:** The signed JSON is pushed to a public storage bucket (e.g., S3) or committed to a `gh-pages` branch.
3.  **Frontend:** A lightweight, static React/HTML page fetches the `trust-snapshot.json` and renders the metrics.

## Schema

The dashboard consumes the `Trust Snapshot` JSON artifact defined in `trust/trust-snapshot.schema.json`.

## Exporter Stub (Concept)

```yaml
# .github/workflows/publish-trust-snapshot.yml
name: Publish Trust Snapshot
on:
  schedule:
    - cron: "0 0 * * *" # Daily
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Aggregate Metrics
        run: ./scripts/trust/aggregate-metrics.sh > trust-snapshot.json
      - name: Sign Snapshot
        run: cosign sign-blob --key env://COSIGN_PRIVATE_KEY trust-snapshot.json > trust-snapshot.json.sig
      - name: Publish to Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public-trust
```
