import pytest
import json
import os
from summit.osint.assumptions import AssumptionRegistry
from summit.osint.rerun_controller import RerunController

def test_assumption_registry():
    registry = AssumptionRegistry()

    # Valid assumption
    registry.register("A1", "Always true", lambda: True)
    # Invalid assumption
    registry.register("A2", "Always false", lambda: False)

    invalidated = registry.verify_all()
    assert "A1" not in invalidated
    assert "A2" in invalidated

    a2 = registry.get_assumption("A2")
    assert a2["is_valid"] is False

def test_assumption_export():
    registry = AssumptionRegistry()
    registry.register("A1", "Test", lambda: True)
    
    exported = registry.export()
    assert len(exported) == 1
    assert exported[0]["id"] == "A1"
    assert "last_verified" in exported[0]
    assert "validity_condition" in exported[0]

def test_rerun_trigger():
    registry = AssumptionRegistry()
    controller = RerunController(registry)

    # Initially all valid
    state = {"value": 10}
    registry.register("A1", "Value > 5", lambda: state["value"] > 5)

    result = controller.check_and_trigger()
    assert result["triggered"] is False

    # Invalidate
    state["value"] = 3
    result = controller.check_and_trigger()

    assert result["triggered"] is True
    assert result["stamp"]["trigger_event"] == "assumption_invalidation"
    assert "A1" in result["stamp"]["invalidated_assumptions"]
