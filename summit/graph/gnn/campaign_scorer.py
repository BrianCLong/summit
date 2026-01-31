import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

# Feature flags
SUMMIT_CAMPAIGNS_ENABLE = os.getenv("SUMMIT_CAMPAIGNS_ENABLE", "0") == "1"
SUMMIT_FEDERATION_ENABLE = os.getenv("SUMMIT_FEDERATION_ENABLE", "0") == "1"

@dataclass
class CampaignScore:
    campaign_id: str
    score: float
    confidence: float
    model_version: str

class CampaignExtractor:
    def extract(self, graph: dict[str, Any], window: dict[str, str]) -> list[Any]:
        # returns list of CampaignSubgraph (stub)
        if not SUMMIT_CAMPAIGNS_ENABLE:
             # Controlled error or empty
             return []
        return []

class CampaignScorer:
    def score(self, campaigns: list[Any], model_path: Optional[str] = None) -> list[CampaignScore]:
        if not SUMMIT_CAMPAIGNS_ENABLE:
             return []

        scores = []
        for c in campaigns:
            # Deterministic stub scoring based on features if present, else random/fixed
            # c is expected to be CampaignSubgraph
            score = 0.5
            if hasattr(c, "features") and "density" in c.features:
                 score = min(1.0, c.features["density"] * 1.5)

            scores.append(CampaignScore(
                campaign_id=c.campaign_id,
                score=score,
                confidence=0.9,
                model_version="stub-v1"
            ))
        return scores

class CampaignExplainer:
    def explain(self, campaign_id: str, score: CampaignScore) -> dict[str, Any]:
        if not SUMMIT_CAMPAIGNS_ENABLE:
             return {}

        return {
            "campaign_id": campaign_id,
            "score": score.score,
            "top_features": ["density", "reciprocity"],
            "contributing_edges": ["e1", "e2"] # IDs only
        }

def run_pipeline():
    if not SUMMIT_CAMPAIGNS_ENABLE:
        print("Campaign pipeline disabled.")
        return

    print("Running campaign pipeline (stub)...")
