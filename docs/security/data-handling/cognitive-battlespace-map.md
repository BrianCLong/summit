# Data Handling — Cognitive Battlespace Map (CBM)

> Classification: INTERNAL — Security/Governance required review before live mode.
> Last updated: 2026-03-05 (PR1 scaffold)

---

## 1. Scope

This document covers data classification, retention, never-log rules, and PII
handling for the CBM subsystem (`summit/cbm/`).

CBM is a **defensive analytics** pipeline. It is not an attribution system,
a moderation system, or a covert collection tool.

---

## 2. Data Classification

| Data Type | Classification | Notes |
|-----------|---------------|-------|
| `DocumentEvent.text` | INTERNAL | Operator-provided; may contain public content |
| `DocumentEvent.source` | INTERNAL | Feed/domain identifiers |
| `DocumentEvent.attrs` | INTERNAL | Must not contain PII (enforced by policy gate) |
| Narrative clusters | INTERNAL | Derived analytics; no raw PII |
| Influence graph nodes | INTERNAL | Domain/account identifiers, not personal |
| AI Exposure artifacts | INTERNAL | LLM probe outputs, no user data |
| Drift baselines | INTERNAL | Statistical aggregates |
| `artifacts/cbm/stamp.json` | INTERNAL | Run metadata, hashes only |
| Feature flag config | INTERNAL | |

---

## 3. Never-Log Rules

The following MUST NEVER appear in logs, artifacts, or structured output:

- Access tokens or API keys
- Private messages or DM content
- Unique persistent user identifiers (UIDs, email addresses, phone numbers)
- Raw scraped HTML where license or ToS compliance is unclear
- Biometric data
- Location data below city-level granularity

Implementation: `DocumentEvent.attrs` validated at ingest boundary;
policy gate `cbm_privacy_gate` rejects events with disallowed keys.

---

## 4. PII Handling

**Deny-by-default.** PII collection is OFF unless:
1. Explicitly configured by operator (`allow_pii: true` in `CBMConfig`), AND
2. Legal review completed and documented, AND
3. Jurisdiction-appropriate retention limits applied.

PII fields are never stored in deterministic artifacts. If a `DocumentEvent`
is found to contain PII (detected by existing `summit/services/ingest` PII
filter), the event is dropped and a `FailureRecord` is emitted with
`stage="pii_filter"`.

---

## 5. Retention Policy

| Artifact | Default Retention | Override |
|----------|------------------|---------|
| `artifacts/cbm/*.json` | 90 days | Operator config |
| Drift baselines | 180 days | Operator config |
| `artifacts/cbm/metrics.json` | 1 year | Operator config |
| Fixture files (`fixtures/`) | Indefinite (test data) | N/A |

Retention enforcement is the operator's responsibility. CBM emits `stamp.json`
with `run_date` to facilitate TTL-based cleanup scripts.

---

## 6. Data Sources

Allowed ingest sources (operator must configure):

| Source Type | Format | ToS Note |
|-------------|--------|----------|
| News/RSS feeds | RSS/JSON | Operator-provided lists; ToS verified by operator |
| OSINT dumps | JSONL/CSV | Deterministic replay only in CI |
| Platform exports | JSON | Operator must confirm ToS compliance |
| Incident feeds | CSV/JSON | Sabotage/cyber event streams |

**Not allowed:**
- Real-time scraping of platforms without explicit ToS exception
- Content licensed only for personal use
- Data obtained via unauthorized access

---

## 7. Security Gates

| Gate | What it checks | Default |
|------|---------------|---------|
| `cbm_privacy_gate` | No PII in DocumentEvent.attrs | BLOCKING |
| `cbm_security_no_network` | No outbound network in CI replay mode | BLOCKING |
| `cbm_poisoning_gate` | Domain/network flooding anomaly | ALERTING |
| `cbm_media_gate` | Synthetic media provenance hooks | ALERTING |

Gates emit `artifacts/cbm/failures.json` on failure.

---

## 8. Threat Notes

See `docs/security/threat-model/cognitive-battlespace-map.md` (to be created in PR6).

Key threats addressed here:
- **Adversary-provided poisoned data:** CBM processes operator-provided feeds
  only; no auto-discovery of sources.
- **PII leakage via attributes:** Deny-by-default + policy gate.
- **Artifact tampering:** Deterministic hashes in `stamp.json` enable integrity
  verification; sign artifacts via existing Summit supply-chain tooling.

---

## 9. Compliance References

- DPIA: `docs/DPIA.md`
- Data retention: `docs/security/data-retention-compliance-guide.md`
- Secrets policy: `docs/security/secrets-policy.md`
- Supply chain: `docs/security/supply-chain.md`
