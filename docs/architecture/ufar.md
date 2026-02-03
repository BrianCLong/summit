# Uncertainty-First Analytic Record (UFAR) and Forked Hypothesis Ledger (FHL)

## Overview

The Uncertainty-First Analytic Record (UFAR) and Forked Hypothesis Ledger (FHL) are architectural primitives designed to shift OSINT and intelligence analysis from "content-only capture + single conclusion" to **reversible collection + dynamic credibility + uncertainty-preserving analysis**.

### Core Objectives
- **Reduce Premature Closure**: Prevent analysts (and agents) from settling on a single hypothesis too early.
- **Preserve Uncertainty**: Explicitly model what we don't know alongside what we think we know.
- **Enable Reversibility**: Maintain a record of rejected alternatives to allow for rapid recovery if new evidence disproves the currently favored hypothesis.

---

## Uncertainty-First Analytic Record (UFAR)

UFAR mandates that every claim or hypothesis must be accompanied by an explicit uncertainty model. Confidence scores are prohibited unless the uncertainty fields are populated.

### Fields
- `uncertainty.epistemic`: Uncertainty arising from lack of knowledge or data (reducible with more collection).
- `uncertainty.aleatoric`: Inherent randomness or variability in the observed system (irreducible).
- `known_unknowns`: A list of specific questions or data points that, if resolved, would reduce epistemic uncertainty.
- `assumptions`: A list of presuppositions made during the analysis.
- `validation_plan`: A set of steps or collection tasks intended to test the assumptions or resolve known unknowns.

---

## Forked Hypothesis Ledger (FHL)

FHL maintains a Directed Acyclic Graph (DAG) of all hypotheses considered during an investigation.

### Principles
- **Parallel Hypotheses**: Systems must maintain multiple parallel hypotheses as long as the evidence remains ambiguous.
- **Evidence Linking**: Every hypothesis must be linked to both supporting and disconfirming evidence.
- **Mandatory Rejection Rationale**: When a hypothesis branch is pruned (rejected), a detailed rationale must be recorded.
- **Reversibility**: Rejected branches can be reactivated if new evidence invalidates the rejection rationale.

---

## CI Enforcement

To ensure compliance with the UFAR methodology, CI gates enforce the following rules:
1. **No Confidence Without Uncertainty**: Fails any artifact that includes a `confidence` score but lacks `uncertainty.epistemic` or `uncertainty.aleatoric` fields.
2. **Branching Factor**: Monitors the number of active hypotheses to ensure parallel alternatives are being explored.
3. **Rationale Completeness**: Ensures that all state transitions (e.g., from `active` to `rejected`) include a pointer to the disconfirming evidence.
