# Autonomous Engineer v2 Operational Readiness Pack

* **How to reproduce a run from artifacts (replay):** Load `run_plan.json` and `execution_ledger.json` and re-run agent.
* **Common failure modes:** policy failure, test failure, plan invalid.
* **Escalation:** “agent stuck” / “tool budget exceeded”
* **SLO assumptions (initial):** 95% runs produce a test-verified patch stack in sandbox mode.

**Rollback/blast radius:**
* single feature flag `SUMMIT_AUTON_ENGINEER=0`
