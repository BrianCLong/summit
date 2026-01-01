# Ecosystem Tier 2: Recommendation Engines

**Status:** High Value, Controlled
**Rights:** Propose, never decide

## Who Belongs Here

### Archetype 2: Simulation & Scenario Engines
* Outcome simulations
* Counterfactual projections
* Risk deltas
* **Constraint:** Simulations **cannot recommend actions**, only scenarios.

### Archetype 4: ML / Analytics Recommendation Engines
* ML models
* Playbook engines
* Optimization tools
* Scenario planners

## What They Can Do

* Propose actions
* Rank alternatives
* Simulate outcomes

## What They Cannot Do

* Execute actions
* Claim correctness
* Suppress uncertainty
* Bypass policy checks

## Required Interface: Recommendation Contract

Summit evaluates recommendations, not vice versa. Missing fields = automatic rejection.

Every recommendation must declare:

1.  **Inputs Declared**: What data was used to generate this?
2.  **Assumptions Explicit**: What is being assumed true?
3.  **Confidence Bounded**: Statistical confidence (0.0 - 1.0).
4.  **Counterfactuals Included**: What happens if we do nothing?
5.  **Alternative Hypotheses**: What else could this be?
6.  **Known Failure Modes**: Where is this model weak?

## Key Guardrail

**Confidence Inflation is Grounds for Revocation.**
Partners must not overstate their certainty to gain influence.
