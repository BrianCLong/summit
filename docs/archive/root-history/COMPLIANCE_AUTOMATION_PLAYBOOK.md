# CompanyOS Risk & Compliance Automation Playbook

## 1. SBOM & Vulnerability Pipeline

- **Generation:**
  - Use Syft for container/image SBOM (SPDX JSON) and CycloneDX for language ecosystems (npm, Python, Rust). Generate per build and embed artifact digest and build run ID.
  - Store SBOMs as OCI artifacts/attestations alongside images (e.g., `registry/org/app:tag-sbom`) and publish to an internal evidence bucket with retention tags.
  - Regenerate SBOMs on rebuilds triggered by base image updates or dependency changes to keep transitive coverage fresh.
- **Vulnerability scanning & CVE budgeting:**
  - Run Grype/OSV-Scanner against SBOMs and built images. Normalize results to a central findings index keyed by digest.
  - **Budgets/gates:** block release if any Critical, if High > 0 beyond 72h, or if High/Medium count exceeds the per-service CVE budget (e.g., 0 Critical, ≤2 High, ≤10 Medium) without an approved waiver. Warn (non-blocking) for Low/Medium within budget or issues younger than 72h.
  - Require timeboxed waivers (owner, ticket, expiry) and auto-fail when expired. Age-out logic: findings older than 30 days must be fixed or waived.
  - Run rescans on a schedule and on dependency/base image drift; reconcile by digest so historical evidence is preserved.
- **3rd-party dependencies & licenses:**
  - Enforce lockfiles and allowed registries; verify checksums for vendored artifacts.
  - Run license scanning (e.g., ORT/ScanCode) using CycloneDX license data. Block if non-approved licenses detected or if notice files are missing; warn if attribution text is stale. Auto-generate `THIRD_PARTY_NOTICES` bundle at build time.

## 2. Attestations & Provenance

- **What we attest:** builder identity, source repo/ref, commit SHA, build command, inputs (SBOM hash, dependency locks, base image digests), test status, policy evaluations, vuln scan summaries, and release approvals.
- **Creation & signing:** generate in-toto/SLSA provenance at build; sign with keyless Sigstore (Fulcio) or hardware-backed keys stored in KMS. Attach as OCI attestations and store in evidence bucket with tamper-evident hashes.
- **Verification:**
  - Deploy and promotion pipelines verify signatures, digest pinning, and policy conformance (Rego/CUE) before allowing rollout.
  - Unsigned/unverifiable artifacts are quarantined; promotion blocks until rebuilt with valid attestations. Waiver path requires security approval and short-lived exception.

## 3. Audit Trails & Exports

- **Essential events:**
  - AuthN/Z (login, MFA challenges), admin actions, role/permission changes.
  - CI/CD: build start/end, provenance hash, SBOM/scan results, gate decisions, waivers, deploy approvals, production changes, and rollbacks.
  - Data handling: exports/downloads, sharing changes, key management, config changes touching secrets, tenant boundary updates.
- **Structure & retention:**
  - Emit JSON logs with fields: `timestamp`, `actor`, `actor_type`, `action`, `resource`, `tenant`, `env`, `request_id`, `input_digest`, `decision`, `policy_version`, `evidence_uri`.
  - Centralize in an immutable log store (WORM/SIEM) with 1-year hot + 6-year cold retention; partition by tenant/env and enforce RBAC+ABAC.
  - Provide export jobs that bundle filtered events into signed NDJSON/Parquet with checksum manifests for auditors/customers.
- **Data minimization & privacy:**
  - Hash/tokenize identifiers where possible, avoid payload/PII in audit events; include purpose/justification tags and data-classification labels.
  - Redaction pipeline for free-text fields; differential access controls for security vs. customer tenants.

## 4. Compliance as Code Outline

- **Policies (Rego/CUE):** vulnerability budgets, allowed licenses, required attestations, deploy-time signature verification, required approvals per environment, data export safeguards.
- **Pipeline checks:** SBOM generation/attachment, vuln + license scans, waiver enforcement, dependency pinning, infra drift detection, secret scanning, approval gates. All checks emit machine-readable results linked to digests.
- **Catalogs:** centrally managed allow/deny lists (licenses, registries, base images) and per-service CVE budgets in version-controlled config.
- **Evidence automation:** auto-create tickets for failing gates, store artifacts (SBOMs, scan reports, attestations) in an evidence registry with retention policies; auto-produce audit bundles per release.

## 5. Example Attestation Record (JSON)

```json
{
  "_type": "https://slsa.dev/provenance/v1",
  "subject": [{ "name": "registry.example.com/app", "digest": { "sha256": "<image-digest>" } }],
  "predicateType": "https://slsa.dev/provenance/v1",
  "predicate": {
    "buildType": "companyos/ci/v1",
    "builder": { "id": "https://ci.companyos.internal/runs/1234" },
    "invocation": {
      "configSource": {
        "uri": "git@github.com:companyos/app.git",
        "digest": { "sha1": "<commit-sha>" },
        "entryPoint": "ci"
      },
      "parameters": {
        "pipeline": "main",
        "cve_budget": { "critical": 0, "high": 2, "medium": 10 }
      },
      "environment": {
        "base_images": ["ghcr.io/org/base@sha256:<digest>"],
        "locks": ["package-lock.json@sha256:<digest>"]
      }
    },
    "materials": [
      { "uri": "git@github.com:companyos/app.git", "digest": { "sha1": "<commit-sha>" } },
      { "uri": "oci://ghcr.io/org/base", "digest": { "sha256": "<digest>" } },
      { "uri": "sbom:registry.example.com/app:1.0.0-sbom", "digest": { "sha256": "<sbom-digest>" } }
    ],
    "metadata": {
      "buildStartedOn": "<timestamp>",
      "buildFinishedOn": "<timestamp>",
      "completeness": { "parameters": true, "environment": true, "materials": true }
    },
    "companyos": {
      "tests": { "status": "passed" },
      "vuln_scan": { "tool": "grype", "critical": 0, "high": 1, "medium": 4 },
      "license_scan": { "non_compliant": [] },
      "approvals": ["security", "release"]
    }
  },
  "signature": { "type": "sigstore", "rekorEntry": "<rekor-url>" }
}
```

## 6. Release is Compliance-Ready Checklist

- SBOMs attached to all artifacts; digests recorded in provenance.
- Vuln scan results within CVE budget or timeboxed waiver; no Critical; Highs mitigated/waived within 72h.
- License scan clean or approved exceptions with notices generated.
- Attestations signed and verified; deploy pipeline enforces signature + policy checks.
- Audit events present for build, approval, deploy, and data/config changes; export bundle generated for the release.
- Secrets/config validated (no plaintext), base images pinned, and dependency locks updated.
- Evidence bundle stored (SBOMs, scans, attestations, waivers, approvals) with retention tags.
