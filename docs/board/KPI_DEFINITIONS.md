# Board KPI Definitions

This document defines the formulas and data sources for the Board-Level KPIs listed in `BOARD_POSITIONING_AND_ROADMAP.md` and the System-Level Metrics in `DOCTRINE.md`.

## 1. Financial & Efficiency Metrics

### Cost per Successful Outcome

**Definition**: The fully loaded cost of autonomous operations divided by the number of verifiable successes.

* **Formula**: `(Sum(Token Costs) + Sum(Tool API Costs) + Sum(Compute Costs)) / Count(Runs where Status = SUCCESS)`
* **Data Source**: `run_manifest.json` (budget.actual_spend), `outcome_evaluation.json` (success_bit).
* **Board Relevance**: Measures the unit economics of autonomy.

### Convergence Time & Retries

**Definition**: The wall-clock time and number of attempts required to reach a terminal success state.

* **Formula (Time)**: `Timestamp(Run_End) - Timestamp(Run_Start)`
* **Formula (Retries)**: `Count(Self_Correction_Loops) / Total_Runs`
* **Data Source**: `execution.log` (timestamps), `trace_spans` (retry_count).
* **Board Relevance**: Proxy for system efficiency and model capability.

## 2. Reliability & Stability Metrics

### Trajectory Stability (Variance)

**Definition**: The deviation in execution path for identical inputs across multiple runs.

* **Formula**: `1 - (Intersection(Path_Nodes_A, Path_Nodes_B) / Union(Path_Nodes_A, Path_Nodes_B))` (Jaccard Distance of trace graphs).
* **Data Source**: `trace_id` comparison from `replay_validation_suite`.
* **Board Relevance**: Predictability gauge; high variance indicates unreliability.

### Replay Success Rate

**Definition**: The percentage of past execution logs that can be deterministically replayed to the exact same outcome.

* **Formula**: `Count(Replays matching Original_Hash) / Count(Total_Replays_Attempted)`
* **Data Source**: `provenance_ledger` (hash_comparison), `replay_service` logs.
* **Board Relevance**: Trust and auditability score; <100% implies "black box" behavior.

### Rollback Frequency

**Definition**: The rate at which the system must revert to a previous checkpoint due to error or policy violation.

* **Formula**: `Count(Rollback_Events) / Count(Total_Actions)`
* **Data Source**: `agent_lifecycle_events` (type=ROLLBACK).
* **Board Relevance**: Indicator of wasted compute and "flailing" behavior.

## 3. Governance & Safety Metrics

### Policy Violations Prevented

**Definition**: The number of potentially unsafe or unauthorized actions blocked by the runtime pre-execution.

* **Formula**: `Count(Policy_Decisions where Outcome = DENY)`
* **Data Source**: `policy_engine.log`, `trace_spans` (tag: policy_status).
* **Board Relevance**: "Safety at work" metric; proves the governance layer is active.

### Human Escalation Rate

**Definition**: The percentage of autonomous runs that require human intervention to complete or fix.

* **Formula**: `Count(Runs with Status = ESCALATED) / Count(Total_Runs)`
* **Data Source**: `run_manifest.json` (status), `pagerduty_incidents` (linked to run_id).
* **Board Relevance**: Measures true autonomy vs. "human-in-the-loop" dependency.

### Audit Readiness (Time-to-Evidence)

**Definition**: The time required to generate a cryptographically verifiable evidence bundle for a specific run.

* **Formula**: `Timestamp(Evidence_Bundle_Created) - Timestamp(Request_Received)`
* **Data Source**: `compliance_service` logs.
* **Board Relevance**: Compliance velocity; risk mitigation speed.

## 4. Incident Metrics

### Mean Time to Recovery (MTTR) for Agent Incidents

**Definition**: The average time to restore normal service after an agent-caused outage or degradation.

* **Formula**: `Sum(Recovery_Time) / Count(Incidents)`
* **Data Source**: `incident_management_system` (Jira/PagerDuty) tagged `source:agent`.
* **Board Relevance**: Operational maturity score.

### "Unknown Unknowns" Captured

**Definition**: The number of unique incident types identified that were not previously in the risk taxonomy.

* **Formula**: `Count(Incidents where Category = NEW)`
* **Data Source**: `AIR_reports` (Agent Incident Reviews).
* **Board Relevance**: Measures the system's ability to surface and adapt to novel failure modes.
