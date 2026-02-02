from summit.integrations.palantir_apollo_autonomy import GlobalMeshOrchestrator, RegionState, ChaosImmunitySystem

def test_global_rollout():
    orch = GlobalMeshOrchestrator()
    orch.regions["us-east"] = RegionState("us-east", True, 0.5)
    orch.regions["eu-west"] = RegionState("eu-west", True, 0.4)
    orch.regions["asia-bad"] = RegionState("asia-bad", False, 0.9)

    orch.define_waves([["us-east"], ["eu-west"], ["asia-bad"]])

    # Wave 1 (US) -> OK
    # Wave 2 (EU) -> OK
    # Wave 3 (Asia) -> Fail

    res = orch.execute_global_rollout("v2.0")
    assert "Halted at Wave 3" in res

def test_predictive_scaling():
    orch = GlobalMeshOrchestrator()
    # History shows rapid rise: 0.1 -> 0.5
    action = orch.predict_and_scale("us-east", [0.1, 0.2, 0.3, 0.5])
    assert "Pre-scaled" in action

def test_chaos_immunity():
    sys = ChaosImmunitySystem()
    code = sys.generate_regression_test("Error: Latency Spike detected at 2024-01-01")
    assert "test_regression_latency_spike" in code
