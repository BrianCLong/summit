# Epistemic Law Specification

**Version:** 1.0.0
**Status:** ENFORCED
**Authority:** Summit Constitution

## 1. Definition

Epistemic Laws are machine-enforced invariants that define the conditions under which information is considered "true" or "valid" within the Summit system. These laws cannot be overridden by administrative privilege, economic incentive, or narrative convenience.

## 2. Core Laws

### EL-01: Evidence Attribution
**Rule:** No assertion may be ingested or propagated without a cryptographic link to its origin.
**Enforcement:**
- All `Activity` and `Claim` objects must have a valid `provenance` field.
- Ingestion pipelines MUST reject data lacking source attribution.
- **Machine Check:** `validateProvenance(entity) == true`

### EL-02: Authority Chain
**Rule:** No decision may be executed without a verifiable chain of authority linking the actor to the specific domain permissions.
**Enforcement:**
- OPA policies must verify `grant_chain` for every write operation.
- **Machine Check:** `verifyAuthority(actor, action, resource) == ALLOW`

### EL-03: Confidence Integrity
**Rule:** No confidence score may be inflated beyond the source's native reliability score.
**Enforcement:**
- Aggregated confidence scores must be calculated using a conservative algorithm (e.g., Min, Bayesian update) and capped by the weakest link in the provenance chain.
- **Machine Check:** `confidence(derived) <= max(confidence(sources))`

### EL-04: Non-Repudiation
**Rule:** No record may be deleted or modified without a trace.
**Enforcement:**
- All mutations must use Append-Only patterns (Ledger).
- "Deletion" is implemented as a tombstone record.
- **Machine Check:** `verifyLedgerIntegrity() == VALID`

## 3. Violation Handling

Violations of Epistemic Law are treated as **Systemic Faults** (Critical Severity).
- **Action:** Immediate rejection of the request.
- **Logging:** Incident created in the Refusal Evidence Log.
- **Alerting:** Security Team notified.
