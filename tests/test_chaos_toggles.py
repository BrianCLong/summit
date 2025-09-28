import os
import pytest
from evals.agentic.harness import AgenticEvalHarness
from evals.agentic.schemas import EvalRecord

def test_chaos_off_by_default(monkeypatch):
    monkeypatch.delenv("CHAOS_ON", raising=False)
    monkeypatch.delenv("CHAOS_TOOL_FAIL_PCT", raising=False)
    monkeypatch.delenv("CHAOS_LATENCY_MS_P95", raising=False)
    monkeypatch.delenv("CHAOS_RETRIEVAL_DROP_TOPK", raising=False)
    monkeypatch.delenv("CHAOS_SCHEMA_MANGLE_PCT", raising=False)
    monkeypatch.delenv("CHAOS_SEED", raising=False)

    h = AgenticEvalHarness("r1_rapid_attribution")
    rec = h.evaluate_case({"id":"t1"})
    
    assert isinstance(rec, EvalRecord)
    assert rec.steps # Ensure there are steps
    # Check chaos_mode in the first step's meta
    assert "chaos_mode" in rec.steps[0].meta
    assert rec.steps[0].meta["chaos_mode"] == "off"

def test_chaos_seed_repro(monkeypatch):
    monkeypatch.setenv("CHAOS_ON","1")
    monkeypatch.setenv("CHAOS_TOOL_FAIL_PCT","0.5")
    monkeypatch.setenv("CHAOS_SEED","123")
    
    h = AgenticEvalHarness("r1_rapid_attribution")
    a = h.evaluate_case({"id":"t2"})
    
    # Re-initialize harness to ensure fresh state for reproducibility
    h_repro = AgenticEvalHarness("r1_rapid_attribution")
    b = h_repro.evaluate_case({"id":"t2"})
    
    assert isinstance(a, EvalRecord)
    assert isinstance(b, EvalRecord)
    
    # Expect same first_failure path when seed fixed
    assert a.first_failure_at == b.first_failure_at
    # Also check if the chaos parameters are the same
    assert a.steps[0].meta.get("chaos_tool_fail_pct") == b.steps[0].meta.get("chaos_tool_fail_pct")
    assert a.steps[0].meta.get("chaos_seed") == b.steps[0].meta.get("chaos_seed")
