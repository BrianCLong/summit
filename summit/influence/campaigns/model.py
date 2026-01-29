from dataclasses import dataclass
from typing import Any, Dict, List, Optional

@dataclass(frozen=True)
class CampaignSubgraph:
    campaign_id: str
    time_window: Dict[str, str]  # {start_iso, end_iso}
    root_entities: List[str]
    subgraph_ref: Dict[str, Any]  # pointer into Summit graph store
    features: Dict[str, float]
    governance: Dict[str, Any] # classification, retention_ttl_days, provenance
    labels: Optional[Dict[str, Any]] = None
    explanation_id: Optional[str] = None  # EVD- pointer
