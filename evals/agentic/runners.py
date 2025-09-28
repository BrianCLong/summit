from typing import Callable, Dict, Any, List
import time
import os
import random

def dummy_runner(case: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    A dummy runbook executor that simulates steps and returns dicts matching StepResult schema.
    Includes chaos toggles based on environment variables.
    """
    print(f"Running dummy runbook for case: {case['id']}")
    steps_data = []
    t0 = time.time()

    # Chaos Toggles (production-safe defaults: OFF)
    CHAOS_ON = os.environ.get("CHAOS_ON", "0").lower() == "1"
    CHAOS_TOOL_FAIL_PCT = float(os.environ.get("CHAOS_TOOL_FAIL_PCT", "0.00"))
    CHAOS_LATENCY_MS_P95 = int(os.environ.get("CHAOS_LATENCY_MS_P95", "0"))
    CHAOS_RETRIEVAL_DROP_TOPK = int(os.environ.get("CHAOS_RETRIEVAL_DROP_TOPK", "0"))
    CHAOS_SCHEMA_MANGLE_PCT = float(os.environ.get("CHAOS_SCHEMA_MANGLE_PCT", "0.00"))
    CHAOS_SEED = os.environ.get("CHAOS_SEED")

    if CHAOS_SEED:
        random.seed(int(CHAOS_SEED))

    chaos_meta = {
        "chaos_mode": "on" if CHAOS_ON else "off",
        "chaos_tool_fail_pct": CHAOS_TOOL_FAIL_PCT,
        "chaos_latency_ms_p95": CHAOS_LATENCY_MS_P95,
        "chaos_retrieval_drop_topk": CHAOS_RETRIEVAL_DROP_TOPK,
        "chaos_schema_mangle_pct": CHAOS_SCHEMA_MANGLE_PCT,
        "chaos_seed": CHAOS_SEED
    }

    # Apply chaos to base latency
    base_latency = 0.0
    if CHAOS_ON and CHAOS_LATENCY_MS_P95 > 0:
        # Simulate a tail latency, e.g., using an exponential distribution or a simple random add
        base_latency = (CHAOS_LATENCY_MS_P95 / 1000.0) * random.uniform(0.5, 1.5) # Simple approximation

    # Simulate step 1
    step1_start = time.time()
    time.sleep(base_latency + random.uniform(0, 0.05))
    step1_end = time.time()
    step1_ok = True
    step1_output = {"result": "data A processed"}
    step1_error = None

    if CHAOS_ON and random.random() < CHAOS_SCHEMA_MANGLE_PCT:
        step1_output = {"malformed_data": "invalid json"}
        step1_ok = False
        step1_error = "Simulated schema mangle"

    steps_data.append({
        "step_id": "step_1",
        "tool": "dummy_tool_A",
        "ok": step1_ok,
        "input": {"query": case.get("query", "default query")},
        "output": step1_output,
        "error": step1_error,
        "started_at_ms": int(step1_start * 1000),
        "ended_at_ms": int(step1_end * 1000),
        "cost_usd": 0.01,
        "retries": 0,
        "meta": chaos_meta # Add chaos metadata to the first step for simplicity
    })

    # Simulate step 2 (can fail based on case input or chaos)
    step2_start = time.time()
    time.sleep(base_latency + random.uniform(0, 0.05))
    step2_end = time.time()
    step2_ok = not case.get("fail_at_step_2", False)
    step2_error = None

    if CHAOS_ON and random.random() < CHAOS_TOOL_FAIL_PCT:
        step2_ok = False
        step2_error = "Simulated tool failure"

    steps_data.append({
        "step_id": "step_2",
        "tool": "dummy_tool_B",
        "ok": step2_ok,
        "input": {"data": "data A"},
        "output": {"result": "data B processed"} if step2_ok else {},
        "error": step2_error,
        "started_at_ms": int(step2_start * 1000),
        "ended_at_ms": int(step2_end * 1000),
        "cost_usd": 0.02,
        "retries": 0,
        "meta": {}
    })

    # Simulate step 3
    step3_start = time.time()
    time.sleep(base_latency + random.uniform(0, 0.05))
    step3_end = time.time()
    steps_data.append({
        "step_id": "step_3",
        "tool": "dummy_tool_C",
        "ok": True,
        "input": {"data": "data B"},
        "output": {"final_answer": {"entity_id": "entity_123"}},
        "started_at_ms": int(step3_start * 1000),
        "ended_at_ms": int(step3_end * 1000),
        "cost_usd": 0.015,
        "retries": 0,
        "meta": {}
    })

    return steps_data

def load_runner(runbook_name: str) -> Callable[[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Loads the appropriate runbook executor based on the runbook name.
    TODO: Replace with actual runbook executors for each runbook.
    """
    print(f"Loading runner for runbook: {runbook_name}")
    # Example of how you might load different runners:
    # if runbook_name == "r1_rapid_attribution":
    #     return R1RapidAttributionExecutor().run
    # elif runbook_name == "r3_disinfo_mapping":
    #     return R3DisinfoMappingExecutor().run
    # else:
    #     raise ValueError(f"Unknown runbook: {runbook_name}")
    return dummy_runner