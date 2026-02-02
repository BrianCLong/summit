from summit.integrations.palantir_apollo_autonomy import DriftAutoRemediation, ServiceConfig

def test_auto_remediation():
    auto = DriftAutoRemediation()
    auto.register_service("svc-1", ServiceConfig(1024, 2))

    # Normal load
    assert auto.analyze_metric("svc-1", "memory_usage_pct", 50.0) is None

    # Overload
    action = auto.analyze_metric("svc-1", "memory_usage_pct", 95.0)
    assert "Scaled svc-1 memory to 1536MB" in action

    # Verify state change
    assert auto.configs["svc-1"].memory_mb == 1536
