# Chaos Experiments

## CE-1: Preview Latency Spike
- **Goal:** Validate R1 triage readiness when Neo4j latency spikes.
- **Method:** Inject 200 ms latency on Neo4j read path via tc; run 50 concurrent preview requests.
- **Expected:** Alert fired within 5 minutes; guardrail depth limit keeps failures <2%; rollback removes tc rule; KPIs recorded.

## CE-2: Ledger Hash Chain Corruption
- **Goal:** Confirm detection and rollback of hash chain break.
- **Method:** Flip `hashPrev` on one event in sandbox via maintenance endpoint; run verification job.
- **Expected:** Verification fails, incident opened, export blocked; R3 rollback restores from last clean snapshot; ledger emits `prov.verification_failed` event.

## CE-3: Cost Guard Adversarial Overage
- **Goal:** Ensure cost guard blocks 80%+ of malicious overage attempts.
- **Method:** Replay usage fixture with 5x surge using `scripts/generate_demo_data.py --kind usage --burst 5` and run through guard.
- **Expected:** Alerts within 5 minutes; block decisions recorded with reasons; advisory mode available if false positives exceed 5%.

## CE-4: Explainability Degradation
- **Goal:** Validate `Explain this view` remains coherent under model drift.
- **Method:** Swap preview model to previous minor version; run curated prompts.
- **Expected:** Explainability includes policy IDs and mitigations; if missing, escalate to governance and pin previous version.

## Reporting
- For each experiment, capture KPIs, decision logs, and provenance export hash; attach to `runbooks/R9_post_incident_review.md` appendix.
