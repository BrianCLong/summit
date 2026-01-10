# Scenario-Backed Risk Narratives

These narratives translate simulation outputs into board-readable stories that show how autonomy levels affect risk and value.

## 1. Narrative Structure

- **Context:** System area, time window, and relevant objectives (cost, reliability, throughput).
- **Current Autonomy Tier:** What tier ran, why it was selected, and observed outcomes.
- **Counterfactual:** Simulation of the same workload at one tier higher (and optionally lower) using recorded inputs.
- **Risk Delta:** How safety, cost, SLA, stability, and reputation scores change; include near-misses and control firings.
- **Value Delta:** Uplift in savings/performance vs. additional exposure; cite confidence interval and any reserves held.
- **Decision Prompt:** Clear go/hold/downgrade recommendation with required controls if higher autonomy is allowed.

## 2. Scenario Library (examples)

- **Traffic Spike Resilience:** Compare Tier 2 (constrained) vs. Tier 3 (adaptive) during a sudden 2x traffic spike; quantify SLA protection vs. extra cost.
- **Cost Optimization Window:** Evaluate whether Tier 3 model selection autonomy reduces cloud spend without breaching latency SLOs.
- **Coordinated Change Management:** Assess if allowing autonomous routing + config rollout together causes oscillation; show arbitration effectiveness.
- **Customer-Facing Messaging:** Determine risk when autonomy drafts status updates—requires delegated approval and tone checks.

## 3. Simulation Expectations

- Use deterministic seeds and archived inputs; store run ID, parameter set, and model versions.
- Record both **executed path** and **counterfactual path** with identical start/end timestamps.
- Capture **controls that would have fired** in the higher-autonomy run and the projected impact if absent.

## 4. Board-Readable Output Template

- One-page summary with: objective, autonomy tiers compared, outcomes table, risk/value delta, controls required, recommendation.
- Include link to supporting evidence: simulation run ID, receipts, policy hashes, and effectiveness checks.
- Avoid technical detail; emphasize decision levers (approve higher tier with guardrails, maintain current tier, or pause).

### 4.1 One-Page Summary Skeleton

1. **Scenario Title + Period**
2. **Objective:** (cost, reliability, safety, or regulatory focus)
3. **Current Tier & Observed Outcome:** concise narrative + key metrics
4. **Counterfactual Tier:** tier simulated + delta table
5. **Risk Delta:** by category with tolerance bands
6. **Controls Fired / Would Fire:** list with outcomes
7. **Recommendation:** approve/hold/downgrade + required approvals
8. **Evidence Links:** run IDs, receipt hashes, policy versions

## 5. Cadence & Ownership

- Produce at least one new scenario per monthly board packet; refresh high-risk domains quarterly.
- Ownership: Risk/Controls lead curates scenarios; domain DRIs validate assumptions; governance signs off on recommendations.

## 6. Simulation Governance

- **Reproducibility:** Each scenario must include deterministic seeds and archived inputs.
- **Integrity:** Simulation artifacts are hashed and stored in the provenance ledger.
- **Review:** Governance review confirms that scenario assumptions match policy-as-code thresholds.
