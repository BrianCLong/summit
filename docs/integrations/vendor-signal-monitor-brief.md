# Vendor Signal Monitor — Implementation Brief

## Readiness Assertion

Summit readiness is asserted as **FINAL** and binding; this brief extends that posture with a governed, audit-grade vendor signal pipeline and treats any deviation as a managed exception, not a defect.【F:docs/SUMMIT_READINESS_ASSERTION.md†L1-L36】

## Evidence Bundle (UEF)

- `docs/SUMMIT_READINESS_ASSERTION.md` (readiness authority and invariants).
- Verified public signals (Maltego, i2, ShadowDragon) are tracked as inputs and recorded as hashes + URLs only; no third-party page bodies are stored in-repo.

## Decision

**Disposition:** INTEGRATE. A Vendor Signal Monitor becomes a governed subsystem that produces deterministic evidence artifacts and feeds the Summit connector strategy. This is a forward directive; no legacy posture is defended.

## MAESTRO Threat Modeling Alignment

- **MAESTRO Layers:** Foundation, Data, Tools, Observability, Security.
- **Threats Considered:** content poisoning, SSRF, policy bypass, data residency misinterpretation.
- **Mitigations:** allowlist-only fetching, strict URL parsing + private range deny, content hashing + diffing, deterministic artifacts, and policy-as-code gates.

## Canonical VendorSignal Schema

```json
{
  "vendor": "maltego|i2|shadowdragon|1trace|traceintel",
  "signal_type": "release|feature|licensing|security|residency|deprecation",
  "title": "string",
  "summary": "string",
  "effective_date": "YYYY-MM-DD|null",
  "observed_at": "ISO-8601 timestamp",
  "source_url": "https://...",
  "content_sha256": "hex",
  "confidence": "high|medium|low",
  "tags": ["auditability", "ai_assistant", "on_prem", "licensing_gate"]
}
```

## Evidence ID Spec (Deterministic)

`EVID-VSIG-{yyyymmdd}-{vendor}-{content_sha256[:12]}`

## Evidence Artifact Contract

Each run emits deterministic artifacts:

- `report.json` (ordered signals)
- `metrics.json` (run stats + parser coverage)
- `stamp.json` (config hash, tool version, ordered input URLs, per-source content hashes)

## Offline / Air-Gapped Execution Workflow

1. **Fixture bundle creation** in a connected environment: fetch allowlisted sources, compute hashes, and store minimal extracts (≤25 words when required for audit).
2. **Air-gapped run** consumes fixture bundle and produces `report.json`, `metrics.json`, `stamp.json` with stable ordering and deterministic IDs.
3. **Diff stage** compares current `report.json` to prior run; emit only new signals (no repetition).

## Governance Controls

- **Allowlist-only sources** enforced by policy-as-code; non-allowlisted domains are blocked deterministically.
- **Tenant partitioning** and append-only storage for raw signal events.
- **Observability**: metrics include source health, parser coverage, and diff counts.
- **Decision reversibility**: each change is traceable via evidence artifacts and content hashes.

## PR-by-PR Dependency Plan (PR1–PR5)

1. **PR1 — Schema + Evidence Framework**
   - `src/vendor_signals/schema.py`
   - `src/vendor_signals/evidence.py`
   - `src/vendor_signals/cli.py`
   - `tests/vendor_signals/test_evidence_id_determinism.py`
   - `docs/vendor-signals/architecture.md`

2. **PR2 — Vendor Adapters + Diffing**
   - `src/vendor_signals/sources/maltego.py`
   - `src/vendor_signals/sources/i2.py`
   - `src/vendor_signals/sources/shadowdragon.py`
   - `src/vendor_signals/diff.py`
   - `fixtures/` sanitized extracts

3. **PR3 — API + Storage (Multi-Tenant)**
   - `src/api/routes/vendor_signals.py`
   - `src/db/migrations/*_vendor_signals.sql`
   - `src/db/models/vendor_signal.py`

4. **PR4 — UI + Alerting**
   - `ui/pages/vendor-signals/index.tsx`
   - `ui/components/VendorSignalCard.tsx`
   - `src/integrations/webhooks/vendor_signals.py`

5. **PR5 — GA Hardening**
   - `docs/vendor-signals/threat-model.md`
   - `ops/runbooks/vendor-signals.md`
   - `security/sbom/vendor-signals.spdx.json`
   - `ci/policies/vendor-signals-policy.rego`

## Governed Exceptions

Any deviation from determinism, allowlist enforcement, or tenant isolation is treated as a **Governed Exception** and recorded with a rollback path.
