# Sprint Plan — Oct 12–23, 2026 (America/Denver)

> **Theme:** “Make trust and integrations spread.”
> **Sprint Goal:** Turn Summit’s trust primitives into shareable, externally verifiable assets and build ecosystem loops (attestations, shareable verification, partner-driven distribution) that compound without leaking sensitive data.

---

## 1) Target Outcomes (measurable)

1. **Shareable verification:** Generate **time-bounded, selectively disclosed** verification links that external auditors can validate in **< 2 minutes**.
2. **Third-party attestations:** Support **≥1 external attestation workflow** (e.g., pen-test letter, audit statement, or security review artifact) with cryptographic binding to evidence.
3. **Ecosystem growth loop:** Adapter ecosystem momentum: **+20% adapters published** (or internal target) and **> 90% install success rate**.
4. **Trust virality:** Prospects can verify “provable posture” claims without full tenant access.
5. **Safety:** No cross-tenant leakage; link access is scoped, revocable, and logged with receipts.

---

## 2) Scope (what ships)

### Epic A — Shareable Verification Links (Selective Disclosure v2)

- **A1. “Verification Link” object**
  - Signed, revocable token pointing to an evidence bundle (or subset), a verification report, and optional inclusion proofs (transparency anchoring).
  - Attributes: tenant scope, disclosure level (Public/Prospect/Auditor), expiry (TTL), allowed verifiers (optional allowlist).
- **A2. Link generation workflow**
  - Switchboard action: “Create verification link.”
  - Requires approvals for external sharing; emits link-create receipt, disclosure policy decision, and link-access receipts on every view.
- **A3. External verification UX**
  - Minimal hosted page that verifies signatures, shows what was verified (checks list), never reveals redacted fields, and can optionally export a “Verification Report PDF.”

### Epic B — Third-Party Attestations (Attestation Registry v0)

- **B1. Attestation object model**
  - Stores issuer identity, scope + period, evidence bundle digests referenced, and signature/verification method.
  - Examples: pen-test attestation letter, SOC report excerpt metadata (not the report itself), security assessment statement.
- **B2. Attestation workflow**
  - Upload/import attestation → verify signature → bind to product release versions, trust center snapshots, and tenants (if customer-specific); receipts for all steps.
- **B3. Trust Center integration**
  - Trust Center shows “Attested by X on date Y” with verifiable metadata and a link to the verification report (without exposing confidential docs unless permitted).

### Epic C — Ecosystem Flywheel v1 (Adapters + distribution)

- **C1. “Verified publisher” program** with a verification checklist and badge; higher default trust score for installs (still policy-gated).
- **C2. Adapter quality signals** visible in Switchboard: install success rate, runtime error rate, perf impact budget, last certification date; auto-deprecate versions that breach thresholds (with receipts).
- **C3. Shareable “Integration Proof”**
  - For a tenant using an adapter: export a redacted proof that the integration is configured and healthy, shareable with partners/customers (e.g., “we have a WORM archive configured”).

### Epic D — Governance Hardening for External Sharing

- **D1. Revocation + rotation**
  - Revoke verification links instantly; rotate signing keys (if needed) without breaking historical verification (maintain key history).
- **D2. Abuse protection**
  - Rate limits for verification endpoints; access anomaly detection (many hits, unusual geography) auto-disables the link and notifies admins.
- **D3. Audit exports**
  - “External Sharing Log” export per tenant showing what was shared, to whom (if known), when, what was verified, and receipts/digests.

---

## 3) Explicit Non-Goals

- Publishing confidential third-party audit reports in full.
- Launching a full public marketplace storefront (focus on trust loops first).

---

## 4) Definition of Done (hard gates)

- Verification links are selectively disclosed, scoped, expiring, revocable, and logged.
- External verification page verifies cryptographic proofs and produces a report.
- At least one third-party attestation workflow is supported with verification and binding to evidence digests.
- Ecosystem quality signals and verified publisher mechanics are live.
- Runbooks exist for link abuse, revocation, and attestation verification failures.

---

## 5) Sprint Demo (live scenario)

1. Generate Trust Center snapshot → create a **Prospect-level verification link**.
2. Open link in external browser → verify checks pass (signatures, inclusion proofs).
3. Revoke link → access denied (receipt logged).
4. Import a pen-test attestation → verify signature → bind to release → show in Trust Center.
5. Install a verified publisher adapter → show integration proof export.

---

## 6) Risks & Mitigations

- **Cross-tenant leakage:** Enforce strict tenant scoping on links, redaction defaults, allowlists, and signed audit receipts.
- **Key rotation breakage:** Maintain key history with deterministic verification fallback and published key metadata.
- **Performance of verification endpoints:** Apply rate limits, caching for public keys/proofs, and monitor p95 verification latency to keep under 2 minutes end-to-end.
- **Adoption friction:** Provide lightweight Switchboard UX, policy templates for approvals, and templated reports for auditors.
- **Compliance drift:** Daily sanity checks on disclosure policies; automated alerts if redaction policies change without approvals.
