import logging
from typing import Dict, List, Optional
from datetime import datetime, timezone
from summit.models.adversarial_asset import AdversarialAsset, EngagementState

logger = logging.getLogger(__name__)

class AssetTurningService:
    def __init__(self):
        self.turned_assets: Dict[str, AdversarialAsset] = {}
        self.defensive_insights: Dict[str, List[Dict]] = {}

    def turn_asset(self, asset: AdversarialAsset, justification: str) -> bool:
        """
        Marks an asset as "turned for monitoring" with justification and provenance.
        Ensures the asset is in a valid state for turning.
        """
        try:
            asset.transition_to(EngagementState.TURNED, justification)
            self.turned_assets[asset.asset_id] = asset

            logger.info(f"Asset {asset.asset_id} successfully turned for monitoring. Justification: {justification}")

            # Audit log for defensive turning
            self._log_audit_event(asset.asset_id, "ASSET_TURNED", {"justification": justification})

            return True
        except ValueError as e:
            logger.error(f"Failed to turn asset {asset.asset_id}: {str(e)}")
            return False

    def record_insight(self, asset_id: str, insight: str, ttp_category: Optional[str] = None):
        """
        Records a defensive insight gained from a turned asset.
        Insights are strictly defensive (e.g., new TTPs, narrative structures).
        """
        if asset_id not in self.turned_assets:
            raise ValueError(f"Asset {asset_id} is not a turned asset.")

        insight_entry = {
            "timestamp": datetime.now(timezone.utc),
            "insight": insight,
            "ttp_category": ttp_category
        }

        if asset_id not in self.defensive_insights:
            self.defensive_insights[asset_id] = []

        self.defensive_insights[asset_id].append(insight_entry)

        logger.info(f"Recorded defensive insight for asset {asset_id}: {insight}")
        self._log_audit_event(asset_id, "INSIGHT_RECORDED", {"ttp_category": ttp_category})

    def _log_audit_event(self, asset_id: str, event_type: str, details: Dict):
        """Internal helper for auditable logging of CI actions."""
        # In a real system, this would write to an immutable audit ledger
        audit_record = {
            "timestamp": datetime.now(timezone.utc),
            "asset_id": asset_id,
            "event_type": event_type,
            "details": details
        }
        logger.info(f"[AUDIT] {audit_record}")
