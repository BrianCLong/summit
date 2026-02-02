import json
import pytest
from summit.tools.risk import ToolRisk
from summit.integrations.palantir import PalantirImporter
from summit.governance.palantir_policy import PalantirActionWrapper

@pytest.fixture
def ontology_with_actions():
    return {
        "objectTypes": [],
        "actionTypes": [
            {
                "apiName": "delete_person",
                "description": "Deletes a person record",
                "logicRules": ["delete objects"]
            },
            {
                "apiName": "update_address",
                "description": "Updates address",
                "logicRules": ["modify objects"]
            }
        ]
    }

def test_import_actions_risk_scoring(ontology_with_actions):
    importer = PalantirImporter({})
    tools = importer.import_actions(ontology_with_actions)

    assert len(tools) == 2

    delete_tool = next(t for t in tools if t.name == "delete_person")
    assert delete_tool.risk == ToolRisk.HIGH

    update_tool = next(t for t in tools if t.name == "update_address")
    assert update_tool.risk == ToolRisk.MEDIUM # or LOW based on default, checking logic

def test_policy_enforcement_deny_high_risk(ontology_with_actions):
    importer = PalantirImporter({})
    tools = importer.import_actions(ontology_with_actions)
    delete_tool = next(t for t in tools if t.name == "delete_person")

    wrapper = PalantirActionWrapper(tool=delete_tool, actor_id="user_123")

    # Should fail without approval token
    with pytest.raises(PermissionError) as excinfo:
        wrapper.execute({"target_id": "p_1"})
    assert "needs_approval" in str(excinfo.value)

def test_policy_enforcement_allow_with_approval(ontology_with_actions):
    importer = PalantirImporter({})
    tools = importer.import_actions(ontology_with_actions)
    delete_tool = next(t for t in tools if t.name == "delete_person")

    wrapper = PalantirActionWrapper(tool=delete_tool, actor_id="admin_user")

    # Should succeed with token
    result = wrapper.execute({"target_id": "p_1", "approval_token": "valid_token"})
    assert "Executed" in result
