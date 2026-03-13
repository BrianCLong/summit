import pytest
from summit.models.adversarial_asset import AdversarialAsset, EngagementState
from summit.services.adversarial import AssetTurningService

def test_turn_asset_success():
    service = AssetTurningService()
    asset = AdversarialAsset(asset_id="asset-123", asset_type="account", state=EngagementState.MONITORED)

    success = service.turn_asset(asset, "Monitoring coordination TTPs")

    assert success is True
    assert asset.state == EngagementState.TURNED
    assert asset.asset_id in service.turned_assets

def test_turn_asset_failure_invalid_state():
    service = AssetTurningService()
    asset = AdversarialAsset(asset_id="asset-456", asset_type="account", state=EngagementState.SUSPECTED)

    success = service.turn_asset(asset, "Attempting invalid turn")

    assert success is False
    assert asset.state == EngagementState.SUSPECTED

def test_record_insight_success():
    service = AssetTurningService()
    asset = AdversarialAsset(asset_id="asset-789", asset_type="account", state=EngagementState.MONITORED)
    service.turn_asset(asset, "Monitoring")

    service.record_insight("asset-789", "Observed use of specific hash-tagging pattern", ttp_category="narrative_amplification")

    assert "asset-789" in service.defensive_insights
    assert len(service.defensive_insights["asset-789"]) == 1
    assert service.defensive_insights["asset-789"][0]["ttp_category"] == "narrative_amplification"

def test_record_insight_failure_not_turned():
    service = AssetTurningService()

    with pytest.raises(ValueError, match="Asset asset-000 is not a turned asset."):
        service.record_insight("asset-000", "Trying to record insight on untracked asset")
