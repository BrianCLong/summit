from prometheus_client import Gauge, Counter
from evals.agentic.schemas import EvalRecord
from os import getenv

JUDGE = getenv("JUDGE_MODE","llm")
CHAOS = "on" if getenv("CHAOS_ON","0")=="1" else "off"

PASS = Counter("agent_eval_pass_total", "Count of passing evals", ["workflow","judge","chaos"])
FAIL = Counter("agent_eval_fail_total", "Count of failing evals", ["workflow","judge","chaos"])
LAT = Gauge("agent_eval_latency_ms", "Latency per run", ["workflow","judge","chaos"])
COST = Gauge("agent_eval_cost_usd", "Cost per run", ["workflow","judge","chaos"])
FIRST_FAIL = Counter("agent_eval_first_failure", "First failure step", ["workflow","step_id","judge","chaos"])

# Placeholder metrics for calibration
KAPPA_SCORE = Gauge("agent_eval_judge_kappa", "Cohen's Kappa score for judge agreement", ["judge_id"])
JUDGE_DRIFT = Gauge("agent_eval_judge_drift", "Drift metric for judge performance", ["judge_id"])

# Coverage metrics
COVERAGE_TOOLS_USED = Gauge("agent_eval_coverage_tools_used", "Number of unique tools used in a workflow run", ["workflow","judge","chaos"])
COVERAGE_UNIQUE_STEPS = Gauge("agent_eval_coverage_unique_steps", "Number of unique steps executed in a workflow run", ["workflow","judge","chaos"])
COVERAGE_RETRY_RATE = Gauge("agent_eval_coverage_retry_rate", "Retry rate in a workflow run", ["workflow","judge","chaos"])
COVERAGE_MAX_BACKTRACK_DEPTH = Gauge("agent_eval_coverage_max_backtrack_depth", "Maximum backtrack depth in a workflow run", ["workflow","judge","chaos"])

def export(rec: EvalRecord):
    # The judge and chaos mode are now determined at the module level from env vars
    # This assumes that the env vars are set correctly before the exporter is loaded
    # For per-record specific judge/chaos, these would need to be passed in rec.meta
    
    (PASS if rec.e2e_ok else FAIL).labels(rec.workflow, JUDGE, CHAOS).inc()
    LAT.labels(rec.workflow, JUDGE, CHAOS).set(rec.latency_ms)
    COST.labels(rec.workflow, JUDGE, CHAOS).set(rec.cost_usd)
    if rec.first_failure_at:
        FIRST_FAIL.labels(rec.workflow, rec.first_failure_at, JUDGE, CHAOS).inc()

    # Export coverage metrics
    if rec.coverage:
        COVERAGE_TOOLS_USED.labels(rec.workflow, JUDGE, CHAOS).set(rec.coverage.get("tools_used", 0))
        COVERAGE_UNIQUE_STEPS.labels(rec.workflow, JUDGE, CHAOS).set(rec.coverage.get("unique_steps", 0))
        COVERAGE_RETRY_RATE.labels(rec.workflow, JUDGE, CHAOS).set(rec.coverage.get("retry_rate", 0.0))
        COVERAGE_MAX_BACKTRACK_DEPTH.labels(rec.workflow, JUDGE, CHAOS).set(rec.coverage.get("max_backtrack_depth", 0.0))

    # Example of how calibration metrics might be set (would typically be done by a separate calibration script)
    # KAPPA_SCORE.labels("llm_gptX_v1").set(0.75)
    # JUDGE_DRIFT.labels("llm_gptX_v1").set(0.02)
