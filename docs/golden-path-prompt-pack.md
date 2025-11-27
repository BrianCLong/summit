# Golden Path Prompt Pack Responses

The following eight artifacts map to the requested role prompts. Each entry focuses on a single concrete improvement with problem, design, example, and validation signals.

## 1) Golden Path Platform Engineer — Service Template Baseline
- **Problem/Bottleneck:** Teams spin up services without consistent security/observability scaffolding, leading to policy drift and slow onboarding.
- **Design:** Provide a `service-api` template with opinionated layout (`/cmd`, `/pkg`, `/configs`, `/ops`), baked-in OpenTelemetry middleware, OPA sidecar policy checks, and secret injection via env vars mounted from the platform vault. Assumes containerized deploys and Helm-managed releases.
- **Example (excerpt):**
  ```yaml
  # .ci/pipeline.yml
  stages: [lint, test, sast, secrets, sbom, policy, build, deploy]
  policy:
    image: openpolicyagent/opa:latest
    script: opa eval --fail --data ./policy --input ./build/manifest.json 'data.cicd.allow'
  deploy:
    script: helm upgrade --install svc-api charts/service-api \
      --set image.tag=$CI_COMMIT_SHA --atomic --wait
  ```
- **Evidence of Done:** New repos created via `scripts/create-service --template service-api` show zero manual edits before first deploy; CI passes default gates; policy violations block merges.

## 2) Identity & Policy Architect — ABAC Policy Bundle for Sensitive Data Writes
- **Threat Mitigated:** Unauthorized PII mutation by over-privileged services.
- **Design:** Ship a reusable OPA bundle `policy/pII-write.rego` enforcing ABAC: subject attributes (`role`, `clearance`, `tenant`), resource attributes (`data_classification`, `residency`), and context (`network_zone`, `mfa_level`). Requires `mfa_level >= step_up` for actions on `data_classification == "pii"`.
- **Service Integration:** Services call the sidecar via `POST /v1/data/authorize` with JSON containing subject/resource/context; decision returns `allow`, `deny`, and `reason` plus audit payload.
- **Test Strategy:** Policy unit tests with `opa test policy`; integration tests in CI mock requests from different tenants/clearances; contract tests ensure services emit audit events on both allow/deny outcomes.

## 3) Observability Lead — HTTP Service Golden Dashboard Spec
- **Problem Detected:** Inconsistent dashboards make incident triage slow.
- **Design:** Standard Grafana JSONNet template expecting Prometheus metrics `http_requests_total`, `http_request_duration_seconds`, `http_errors_total`, and saturation metrics `go_goroutines` or `nodejs_eventloop_lag_seconds`. Includes trace-to-log links via `trace_id` label.
- **Example Panels:** Latency (P50/P90/P99), error rate by route, saturation heatmap, canary vs baseline comparison, and SLO status panel using `ratio(1 - increase(http_errors_total[5m]) / increase(http_requests_total[5m]))`.
- **Evidence of Done:** Any new service imported into Grafana shows filled panels (no “no data”); on synthetic 500 injection, error panel alerts and links to traces.

## 4) Data Spine Engineer — Canonical Event Envelope Schema v1
- **Classification Impact:** Designed to carry both PII and non-PII; `data_classification` field dictates handling.
- **Design:** Versioned JSON schema with required fields: `id` (ULID), `occurred_at` (RFC3339), `producer` (service name), `tenant_id`, `data_classification` (enum: `public|internal|pii|secret`), `region`, `payload` (typed object), and `lineage` (array of `{source_id, transformation, actor}`), plus `retention_ttl_days` for enforcement.
- **IntelGraph Tie-in:** Events emitted to the bus include `lineage` metadata so Summit/IntelGraph can stitch provenance chains; CDC pipelines copy schema version into `event_version` for evolution tracking.
- **Validation Flow:** Schema registry rejects publishes without version; sample query: “show all PII payloads with lineage containing service X in region eu-west-1 within last 30 days.”

## 5) Reliability & Release Commander — Canary Auto-Rollback Policy
- **Failure Scenario:** New release increases error rate/latency beyond budget during canary.
- **Design:** Helm hook or Argo Rollouts with analysis template watching `error_rate` and `p99_latency` compared to baseline. Rule: if `error_rate_canary > baseline * 1.5` or `p99_latency_canary > 1.25s` for 3 consecutive checks (1m interval), trigger rollback and freeze rollout for 2 hours.
- **Signals:** Prometheus metrics `http_errors_total`, `http_request_duration_seconds`; logs tagged `release_id`; traces sampled for slow spans.
- **Decision Rule:** If threshold breached → `rollout abort && notify #release-warroom`; else continue to next step; after 10m healthy, promote to 100%.

## 6) Developer Ergonomics Chief — Devcontainer + Compose Quickstart
- **Pain Removed:** New engineers spend hours aligning local runtimes.
- **Design:** `/.devcontainer/devcontainer.json` plus `docker-compose.dev.yml` bringing up API, DB, and OPA sidecar with seeded fixtures. Includes `postCreateCommand` running `npm install && npm run lint` to ensure environment parity.
- **Golden Path Tie-in:** Same compose file used in CI smoke tests; scaffolding CLI copies it into new services.
- **Metric:** Median time-to-first-PR drops below 30 minutes; survey asks if devcontainer started successfully on first try.

## 7) Product Vertical Captain — Compliance Ops “Evidence Locker” Slice
- **Capability Spec:** Automated Evidence Locker for auditors to retrieve signed control artifacts within 90 days.
- **Definition of Ready:** Flag `compliance.evidence_locker` enabled; storage bucket with region tags; signing key in KMS; user stories refined for upload, search, export; telemetry schema defined.
- **Definition of Done:** Users can upload evidence with classification tags; exports include attestation manifest; dashboard shows usage and errors; runbook for KMS key rotation; feature behind cohort flag with feedback form.
- **User Flow:** Admin enables flag → auditor uploads evidence with classification → system signs and stores with residency guard → auditor searches and exports disclosure pack → audit log captured for each action.

## 8) Risk & Compliance Automation Officer — Pre-Release SBOM + Attestation Step
- **Risk Addressed:** Supply chain tampering and unknown dependencies at release.
- **Design:** CI job `sbom_attest` runs after tests: generate SBOM via `syft dir:. -o json > sbom.json`; sign artifact and container image with cosign using keyless; produce SLSA provenance via `slsa-framework/slsa-generator`. Store outputs in artifact registry with immutable tags and attach digest to release metadata.
- **Measurement:** Track % of releases with attached SBOM + signature; alert if missing. CVE budget checks parse `grype` output and fail build on Critical/High above threshold.
- **Lifecycle Placement:** Pre-release gate before deploy; failure halts promotion and opens ticket with SBOM + scan summary.
