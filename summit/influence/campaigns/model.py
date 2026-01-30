from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class CampaignSubgraph:
    campaign_id: str
    time_window: dict[str, str]  # {start_iso, end_iso}
    root_entities: list[str]
    subgraph_ref: dict[str, Any]  # pointer into Summit graph store
    features: dict[str, float]
    governance: dict[str, Any] # classification, retention_ttl_days, provenance
    labels: Optional[dict[str, Any]] = None
    explanation_id: Optional[str] = None  # EVD- pointer
