# Standards — Cognitive Battlespace Map (CBM)

> Last updated: 2026-03-05 (PR1 scaffold)

---

## 1. Positioning

CBM is **observability for narrative warfare + AI exposure**. Defensible claims:

- Deterministic narrative clustering with replay-safe artifacts
- Coordination heuristics with explainable signal ledger
- Explicit AI exposure mapping (retrieval → citation → stance → overlap)
- Drift detector for narrative laundering over time

**Avoid:**
- Claiming attribution to a specific state actor
- Claiming "stops disinformation"
- FUD about platforms or models

---

## 2. Evidence ID Standard

Pattern: `EVID-CBM-<YYYYMMDD>-<RUNHASH8>-<SEQ04>`

- `YYYYMMDD`: from `CBMConfig.run_date` (operator-set; never `datetime.now()`)
- `RUNHASH8`: first 8 chars (uppercase) of SHA-256(`config + sorted(input_fingerprints)`)
- `SEQ04`: zero-padded 4-digit sequence within the run

Example: `EVID-CBM-20260305-A1B2C3D4-0001`

---

## 3. Determinism Requirements

All CBM artifacts MUST:

- Use `json.dumps(..., sort_keys=True)` — sorted keys
- Sort all lists before serialization (e.g., `sorted(narratives, key=lambda n: n["id"])`)
- Contain no wall-clock timestamps (`datetime.now()`, `time.time()`)
- Contain no random UUIDs (`uuid.uuid4()`)
- Use `run_date` from config for any date fields
- Produce byte-identical output given identical config + inputs

Verified by: `tests/test_cbm_determinism.py::test_artifact_content_determinism`

---

## 4. Import / Ingest Matrix

| Source | Format | Notes |
|--------|--------|-------|
| News/RSS | RSS/JSON | Operator-provided feed lists |
| OSINT dumps | JSONL/CSV | Deterministic replay for CI |
| Platform exports | JSON | ToS-compliant only |
| Incident feeds | CSV/JSON | Sabotage/cyber event streams |

---

## 5. Export / Artifact Matrix

| Artifact | Format | Consumer | PR |
|----------|--------|----------|----|
| `artifacts/cbm/narratives.json` | JSON | UI/analytics | PR2 |
| `artifacts/cbm/influence_graph.json` | JSON | Graph viz | PR3 |
| `artifacts/cbm/data_void_risk.json` | JSON | Risk dashboards | PR4 |
| `artifacts/cbm/ai_exposure.json` | JSON | Risk dashboards | PR5 |
| `artifacts/cbm/drift_report.json` | JSON | Monitoring | PR6 |
| `artifacts/cbm/stamp.json` | JSON | CI verification | PR1 |
| `artifacts/cbm/failures.json` | JSON | CI gate / alerting | PR1 |
| `artifacts/cbm/metrics.json` | JSON | Perf budget CI | PR2+ |

---

## 6. Feature Flag Registry

| Flag | Default | Enables |
|------|---------|---------|
| `cbm_enabled` | OFF | Master switch |
| `cbm_llm_probe_enabled` | OFF | AI probe stage (PR5) |
| `cbm_hybrid_correlation_enabled` | OFF | Incident correlation (PR5) |

Flags are set in `CBMConfig`. CI always uses `enabled=True` with probes OFF
for replay-mode tests.

---

## 7. Non-Goals

- Automatic attribution to a state actor
- Automated takedowns or moderation actions
- Covert collection
- Real-time scraping without operator ToS validation

---

## 8. Performance Budgets (CI-enforced from PR2+)

| Stage | Budget |
|-------|--------|
| Narrative extraction + clustering (50k docs) | < 10 min, < 4 GB RAM |
| Coordination detection (10k asset window) | < 8 min |
| AI probe batch (50 prompts × N models) | < 12 min (flagged) |
| End-to-end CBM run | < 20 min (CI profile mode) |

Profiling output: `artifacts/cbm/metrics.json`

---

## 9. Alert Types

| Alert | Condition |
|-------|-----------|
| `CBM_NARRATIVE_SURGE` | Narrative cluster growth > threshold |
| `CBM_COORDINATION_CLUSTER` | New coordination cell detected |
| `CBM_AI_LAUNDERING_RISK` | AI exposure overlap > risk threshold |
| `CBM_DATA_VOID_SPIKE` | Authority density drop for topic/locale |
| `CBM_DRIFT_DETECTED` | Baseline drift beyond tolerance |

Alert spec: `docs/ops/alerts/cbm_alerts.md` (created in PR6).

---

## 10. References

- Architecture: see CBM Subsumption Plan (`docs/standards/` or PR description)
- Data handling: `docs/security/data-handling/cognitive-battlespace-map.md`
- Runbook: `docs/ops/runbooks/cognitive-battlespace-map.md` (PR6)
- Existing cognitive domain: `cogwar/`, `summit/fimi/`
