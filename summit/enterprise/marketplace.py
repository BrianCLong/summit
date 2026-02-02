from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass
class MarketItem:
    id: str
    creator_id: str
    type: str # "TRANSFORM", "AGENT_GENOME"
    price_usd: float
    content: str # Code or Config

class AlgorithmStore:
    """
    App Store for Intelligence.
    """
    def __init__(self):
        self.items: Dict[str, MarketItem] = {}
        self.purchases: List[Dict] = []

    def publish(self, item: MarketItem) -> str:
        self.items[item.id] = item
        return f"Published {item.id} by {item.creator_id}"

    def purchase(self, item_id: str, buyer_id: str) -> Dict[str, float]:
        item = self.items.get(item_id)
        if not item: raise ValueError("Item not found")

        # Revenue Share 70/30
        creator_share = item.price_usd * 0.70
        platform_share = item.price_usd * 0.30

        self.purchases.append({
            "item_id": item_id,
            "buyer": buyer_id,
            "creator_payout": creator_share,
            "platform_payout": platform_share
        })

        return {"creator": creator_share, "platform": platform_share}
