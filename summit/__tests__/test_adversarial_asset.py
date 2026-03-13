import pytest
from datetime import datetime
from summit.models.adversarial_asset import AdversarialAsset, EngagementState, InteractionEvent, InteractionType

def test_asset_initialization():
    asset = AdversarialAsset(asset_id="test-1", asset_type="account")
    assert asset.asset_id == "test-1"
    assert asset.state == EngagementState.UNKNOWN
    assert len(asset.history) == 0

def test_valid_state_transition():
    asset = AdversarialAsset(asset_id="test-1", asset_type="account", state=EngagementState.MONITORED)
    asset.transition_to(EngagementState.TURNED, "Asset turned for monitoring")
    assert asset.state == EngagementState.TURNED
    assert asset.justification == "Asset turned for monitoring"

def test_invalid_state_transition_from_burned():
    asset = AdversarialAsset(asset_id="test-1", asset_type="account", state=EngagementState.BURNED)
    with pytest.raises(ValueError, match="Burned assets cannot be transitioned to other states."):
        asset.transition_to(EngagementState.MONITORED, "Attempting to unburn")

def test_invalid_turn_transition():
    asset = AdversarialAsset(asset_id="test-1", asset_type="account", state=EngagementState.SUSPECTED)
    with pytest.raises(ValueError, match="Only monitored assets can be turned."):
        asset.transition_to(EngagementState.TURNED, "Turning suspect")

def test_add_interaction_event():
    asset = AdversarialAsset(asset_id="test-1", asset_type="account")
    event = InteractionEvent(event_id="evt-1", type=InteractionType.CONTENT_DROP, description="Propaganda drop")
    asset.add_event(event)
    assert len(asset.history) == 1
    assert asset.history[0].event_id == "evt-1"
