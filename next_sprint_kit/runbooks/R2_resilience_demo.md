# R2 Runbook — Resilience Demo & KPI Capture

## Purpose
Demonstrate NL→Cypher preview, provenance export, and cost guard behavior with recorded KPIs for demos.

## KPIs to Capture
- Preview: median and P95 latency, accuracy %, guardrail blocks.
- Ledger: ingest success %, hash verification result, export duration.
- Cost guard: alert-to-block latency, block rate on adversarial overage.

## Steps
1. **Setup demo data:** `python scripts/generate_demo_data.py --seed 42 --output-dir next_sprint_kit/demo_data`.
2. **Warm preview cache:** Run curated prompts list (`tests/e2e/ingest_to_report.md`) to prime intent graph.
3. **Record KPIs:** Export Grafana snapshot (JSON) and screenshot for the demo deck; attach to runbook appendix.
4. **Execute provenance export:** Call `POST /prov/v1/export` with demo filters; store bundle under `demo_exports/r2`. Run verification script and log result.
5. **Run cost guard chaos test:** Trigger scripted overage from `chaos/experiments.md`; observe block/allow decisions and timestamp latency.
6. **Log verification:** Save KPI table plus verification hashes to `appendix.csv` for R3 handoff.

## Failure Modes & XAI Notes
- **Preview drift:** If accuracy <95%, capture explainability blocks and correlate with policy changes.
- **Ledger export fails:** Inspect manifest checksum; rerun with smaller batch size; document signer response.
- **Cost guard noisy alerts:** Switch to advisory mode and annotate decision reasons; feed back to policy tuning.
