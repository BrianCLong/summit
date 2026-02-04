import pytest
from summit.tools.risk import ToolRisk
from summit.integrations.palantir import SummitTool
from summit.governance.palantir_policy import PalantirActionWrapper

@pytest.fixture
def critical_tool():
    return SummitTool(
        name="nuke_database",
        description="Destructive",
        risk=ToolRisk.HIGH,
        config={}
    )

def test_mpa_success(critical_tool):
    wrapper = PalantirActionWrapper(tool=critical_tool, actor_id="operator")

    # Needs 2 distinct approvers
    result = wrapper.execute({
        "approver_1": "admin_alice",
        "approver_2": "admin_bob"
    })
    assert "allow (MPA)" in result

def test_mpa_fail_same_approver(critical_tool):
    wrapper = PalantirActionWrapper(tool=critical_tool, actor_id="operator")

    with pytest.raises(PermissionError):
        wrapper.execute({
            "approver_1": "admin_alice",
            "approver_2": "admin_alice" # Fail: Must be distinct
        })

def test_break_glass_success(critical_tool):
    wrapper = PalantirActionWrapper(tool=critical_tool, actor_id="operator")

    result = wrapper.execute({
        "break_glass_reason": "Database locked up",
        "break_glass_token": "EMERGENCY_OVERRIDE"
    })
    assert "allow (Break-Glass)" in result

def test_break_glass_fail_no_reason(critical_tool):
    wrapper = PalantirActionWrapper(tool=critical_tool, actor_id="operator")

    with pytest.raises(PermissionError):
        wrapper.execute({
            "break_glass_token": "EMERGENCY_OVERRIDE"
            # Fail: Reason mandatory
        })
