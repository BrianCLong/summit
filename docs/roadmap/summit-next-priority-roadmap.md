# Summit Next-Priority Roadmap (GA Sprint)

## Readiness Assertion
Summit advances to GA only when the Golden Path, governed evidence, and enforceable agent controls are simultaneously shippable. This roadmap converts that requirement into an execution sequence with explicit exit criteria.

## Priority Stack

### P0 — GA Blockers (Must Finish to Ship v1.0)

1. **Golden Path deployment (one-command bring-up)**
   - Ship `make summit-up` or equivalent full-stack compose target.
   - Auto-load sample IntelGraph dataset.
   - Enable default policy bundle and deterministic demo scenario script.
   - **Exit metric:** new operator reaches first graph query in under 10 minutes.

2. **End-to-end evidence and provenance bundle**
   - Require claim→evidence linkage, decision traceability, and agent audit trail on every demo run.
   - Standardize artifact output under:
     - `evidence-bundle/run.json`
     - `evidence-bundle/decisions.json`
     - `evidence-bundle/provenance.json`
     - `evidence-bundle/policy_checks.json`
   - **Exit metric:** bundle generation is deterministic and CI-verifiable.

3. **Agent governance enforcement gates**
   - Enforce policy checks before tool execution.
   - Add red-team mode toggle and action-level risk scoring.
   - Add kill switch and rate limiting for unsafe trajectories.
   - **Exit metric:** unsafe agent actions are blocked by policy, logged, and recoverable.

### P1 — Intelligence Differentiation (Why Summit Wins)

4. **IntelGraph Insight Engine v1**
   - Add hub/anomaly pattern detection.
   - Add bounded multi-hop inference.
   - Add confidence scoring and hypothesis tracking.
   - **Exit metric:** deterministic insight statements with confidence and supporting evidence paths.

5. **Difficulty-aware model routing (DAAO-lite)**
   - Route simple tasks to low-cost models.
   - Escalate hard reasoning to premium models.
   - Route unsafe/ambiguous tasks to human review.
   - **Exit metric:** lower inference cost per task with unchanged or improved quality gate pass rate.

6. **Memory architecture v1**
   - Episodic memory: run logs and outcomes.
   - Semantic memory: graph facts and verified entities.
   - Procedural memory: policies, tools, and reusable playbooks.
   - **Exit metric:** repeat tasks demonstrate measurable context retention without policy regressions.

### P2 — Revenue Wedge (Switchboard)

7. **Switchboard OSINT front door**
   - Entity search, relationship visualization, claim verification, report export.
   - **Exit metric:** a non-technical operator can complete one publishable report flow end-to-end.

8. **Enterprise pilot playbook**
   - Package use cases, deployment sequence, security posture, and ROI narrative.
   - Target investigative journalism, compliance teams, NGOs, and state/local government.
   - **Exit metric:** pilot package accepted by at least one design partner without custom architecture rewrite.

### P3 — Trust, Safety, and Governance Moat

9. **FactCert / claim verification module**
   - Implement claim evidence scoring, source reliability weighting, and conflict detection.
   - **Exit metric:** every exported claim carries verification metadata and conflict status.

10. **Operator control dashboard**
   - Show active agents, risk scores, policy violations, evidence completeness, and cost telemetry.
   - **Exit metric:** operators can detect and intervene on policy/risk drift in one screen.

## Single Highest-Leverage Move (Now)

Deliver the **Golden Path Demo Scenario** as the integration anchor for GA:

- Agents ingest real sample inputs.
- IntelGraph materializes relationships.
- Insight Engine surfaces at least one non-trivial finding.
- Evidence bundle proves every output.
- Governance gates enforce safe execution.

This single scenario doubles as demo, sales proof, regression test, and release gate.

## MAESTRO Security Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered:** prompt injection, tool abuse, policy bypass, evidence tampering, runaway automation.
- **Mitigations:** pre-tool policy enforcement, immutable audit trails, deterministic evidence artifacts, risk-scored agent actions, kill switch + rate limits.

## 30/60/90-Day Execution Compression

- **Day 0–30:** Close P0-1 and P0-2 (Golden Path + evidence bundle skeleton and CI checks).
- **Day 31–60:** Close P0-3 and P1-4 (governance enforcement + Insight Engine v1).
- **Day 61–90:** Close P1-5, P1-6, and P2-7 (routing, memory, and Switchboard wedge readiness).

## GA Exit Readiness Criteria

GA is ready when all three statements are true:

1. Golden Path demo runs green from clean environment.
2. Evidence/provenance/governance artifacts are complete and machine-verified.
3. Operator can explain, reproduce, and safely stop any agent decision path.
