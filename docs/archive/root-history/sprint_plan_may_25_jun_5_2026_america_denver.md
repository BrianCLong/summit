# Sprint 12 — Maturity & Moat: Transparency, Selective Disclosure, and Provable Deletion

**Sprint window (America/Denver):** Mon May 25, 2026 → Fri Jun 5, 2026  
**Theme:** "Trust features that are hard to copy"

---

## Sprint goal

Make Summit’s provenance system _provably trustworthy_ for auditors and enterprise buyers by strengthening selective disclosure, optional transparency log anchoring, and a deletion workflow that emits verifiable purge manifests end-to-end.

---

## Target outcomes (measurable)

1. **Selective disclosure:** Evidence exports redact fields while remaining **cryptographically verifiable** (ship one robust scheme end-to-end).
2. **Transparency anchoring:** Receipts can be optionally anchored to an **append-only transparency log** with verifiable inclusion proofs.
3. **Provable deletion:** Tenant purge produces a **verifiable purge manifest** (what was deleted + what remains + why).
4. **Audit UX:** Switchboard supports **Auditor mode** to verify receipts, inclusion proofs, and purge manifests without admin privileges.
5. **Operational safety:** Runbooks, dashboards, and failure-mode handling cover log outage, anchor backlog, and purge retries.

---

## Scope (what ships)

### Epic A — Selective Disclosure v1 (Evidence Bundles)

- **A1. Redaction model:** Define disclosure levels (Public / Customer / Auditor / Internal) and apply field-level redaction rules based on policy + requester role.
- **A2. Verifiable redaction:** Implement a verifiable scheme (e.g., Merkleized JSON/commitment trees); redacted fields replaced with commitments, receipts include root hash; provide `verify` tooling for offline validation.
- **A3. API + tooling:** `POST /evidence/export?disclosure_level=...`; `summit evidence verify <bundle>` returns pass/fail plus verification coverage.

### Epic B — Transparency Log / Anchoring v0

- **B1. Anchoring adapter:** Periodically anchor receipt batch root hashes, policy bundle version hash, and optional release artifact hashes; store inclusion proofs and anchor references.
- **B2. Inclusion verification:** `GET /receipts/{id}/proof` returns inclusion proof data + anchor reference; Switchboard displays "Included in log ✅" or "Pending ⏳" with verification.
- **B3. Backlog handling:** Anchoring worker with retries/DLQ; dashboards for anchor lag, failures, and proof generation time.

### Epic C — Provable Deletion v1 (Purge Manifests + Residual Proof)

- **C1. Purge manifest schema:** Capture tenant id, region tags, invoked retention policy, deleted data categories (objects/rows/indexes/caches/archives), time window, counts, digests of deletion plans, operator approvals/policy decisions, and residuals with rationale.
- **C2. Deletion plan + execution receipts:** Generate a deletion plan before purge; execute with step-level receipts; produce a signed, exportable final purge manifest.
- **C3. Verification tooling:** `summit purge verify <manifest>` validates signatures, references receipts, deletion-plan digests vs executed steps, and justifies residuals explicitly.

### Epic D — Switchboard Auditor Mode

- **D1. Read-only auditor role:** Tenant-scoped role with no write access; UI focused on receipts list + verification, inclusion proof verification, evidence bundle export at auditor disclosure level, and purge manifest browsing/verification.
- **D2. Verification UI:** Upload/paste bundle or manifest → verify → show results and missing elements.

---

## Explicit non-goals

- Full legal eDiscovery tooling.
- Cross-tenant analytics (privacy-safe analytics is separate).
- Mandatory transparency anchoring for all customers (keep optional per tenant/tier).

---

## Definition of Done (hard gates)

- Evidence bundles support redaction **and** offline verification.
- Anchoring pipeline works in staging; inclusion proofs retrievable and verifiable.
- Purge manifests produced end-to-end, signed, exportable, and verifiable.
- Auditor mode enforces least-privilege with tenant scoping.
- Runbooks + dashboards cover anchor lag, verification failures, and purge retries.

---

## Sprint demo (live)

1. Export an auditor-level evidence bundle (redacted).
2. Offline verify the bundle → PASS.
3. Fetch inclusion proof for a receipt → verify anchored ✅.
4. Run tenant purge workflow → produce purge manifest.
5. Auditor opens manifest → verifies signatures, step receipts, and residual rationale.
