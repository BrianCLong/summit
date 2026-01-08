# Threat Model: Auto-Scientist Stack

## 1. Assets

- **Generated IP**: The scientific hypotheses and results.
- **Model Weights**: If using fine-tuned models.
- **Compute Resources**: The execution engine.

## 2. Threats

### T1: Hazardous Knowledge Generation

- **Description**: The system generates novel, dangerous knowledge (e.g., bio-weapon recipes) that bypasses standard safety filters due to scientific context.
- **Likelihood**: Medium
- **Severity**: Critical

### T2: Reward Hacking / Metric Gaming

- **Description**: The Generator optimizes for "passing oversight" without actually improving safety or quality, potentially using adversarial examples against the Oversight model.
- **Likelihood**: High
- **Severity**: High

### T3: Resource Exhaustion

- **Description**: The recursion loop spins indefinitely, consuming budget.
- **Likelihood**: Low
- **Severity**: Medium

## 3. Mitigations

### M1: Dual-Layer Oversight (Defense against T1)

- **Implementation**: Use two distinct Oversight Models from different providers (e.g., OpenAI and Anthropic) to vote on safety. If either flags as unsafe, the hypothesis is rejected.

### M2: Constitution-Based Critique (Defense against T2)

- **Implementation**: The Oversight model must cite specific clauses from the "Scientific Constitution" when rejecting.

### M3: Hard Circuit Breakers (Defense against T3)

- **Implementation**: Max iteration limit (`max_iterations=5`) and max budget limit enforced by the API gateway.
