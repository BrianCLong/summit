# Decision Capital

> **Thesis:** Every governed decision produces an asset that compounds in value, while most software accumulates complexity debt.

## The Concept

In traditional systems, governance is a friction—a tax on speed. In Summit, governance is a capital accumulation mechanism.

When a decision is made within Summit (e.g., approving a high-risk deployment, overriding a policy, or resolving an incident), the system captures:

1. **Context:** What was the state of the world? (Metrics, logs, active threats)
2. **Rationale:** Why was this decision made? (Human justification, policy reference)
3. **Outcome:** What happened next? (Success, failure, rollback, incident)

This triplet (Context, Rationale, Outcome) forms a unit of **Decision Capital**.

## The Asset Class

Decision Capital is an intangible asset that behaves like tangible infrastructure:

- **Depreciation:** None. Unlike code, well-indexed decision history grows _more_ valuable as the dataset expands.
- **Liquidity:** High. Future agents (human or AI) can "spend" this capital to make faster, safer decisions.
- **Yield:** Non-linear. A single recorded "near-miss" can prevent catastrophic failure across the entire fleet forever.

## Economic Mechanisms

### 1. Decision Reuse (Cost Avoidance)

- **Mechanism:** When a user encounters a blocked action or policy violation, Summit queries the Decision Capital Ledger.
- **Economic Impact:** If a similar context exists with a positive outcome, the system can recommend a path or auto-approve (if risk is below threshold).
- **Metric:** `Cost Avoided per Decision Class` = (Time to investigate _ Hourly Rate) _ Reuse Count.

### 2. Confidence Calibration (Risk Reduction)

- **Mechanism:** Aggregating outcomes allows Summit to calibrate confidence scores for AI agents. "We have seen this pattern 50 times, and 49 times it was safe."
- **Economic Impact:** Increases automation density. Humans only review truly novel edge cases.
- **Metric:** `Confidence Delta` over time.

### 3. Training Data Flywheel (Future Value)

- **Mechanism:** Every human override is a labelled training example for the next generation of policy models.
- **Economic Impact:** The platform adapts to the organization's unique risk appetite without manual tuning.
- **Metric:** `Model Precision` vs. `Manual Policy Updates`.

## Operationalizing Decision Capital

To convert this from theory to practice, we implement the **Decision Capital Ledger**:

| Attribute             | Description                                                      | Economic Proxy  |
| :-------------------- | :--------------------------------------------------------------- | :-------------- |
| **Asset ID**          | Unique hash of the Decision Triplet                              | Traceability    |
| **Reusability Score** | Likelihood this decision applies elsewhere                       | Potential Value |
| **Depreciation Rate** | How fast this knowledge becomes stale (e.g., tech stack changes) | Asset Lifespan  |
| **Accumulated Value** | Total hours/risk saved by reusing this decision                  | ROI             |

## Strategic Implication

Competitors sell tools that help you make decisions _now_. Summit sells a platform where _past_ decisions pay for _future_ speed.
