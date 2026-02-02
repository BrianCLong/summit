from summit.integrations.palantir_apollo_precog import PhysicsSimulator, WorkloadTeleporter

def test_physics_failure_prediction():
    sim = PhysicsSimulator()
    sim.register_node("srv-1")

    # Run hot load
    alerts = []
    for _ in range(50):
        alert = sim.tick(100.0) # 100% Load
        if alert: alerts.append(alert)

    assert any("OVERHEATING" in a for a in alerts)

def test_teleport():
    tp = WorkloadTeleporter()
    res = tp.teleport("proc-1", "srv-1", "srv-safe")
    assert "teleported" in res
