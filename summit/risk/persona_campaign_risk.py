from enum import Enum
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class RiskFactor(BaseModel):
    name: str
    weight: float
    value: float
    contribution: float

class PersonaRisk(BaseModel):
    persona_id: str
    risk_score: float = Field(ge=0, le=100)
    risk_level: RiskLevel
    factors: List[RiskFactor] = []

class CampaignRisk(BaseModel):
    campaign_id: str
    risk_score: float = Field(ge=0, le=100)
    risk_level: RiskLevel
    factors: List[RiskFactor] = []

class RiskScoringModel:
    @staticmethod
    def calculate_risk_level(score: float) -> RiskLevel:
        if score < 25:
            return RiskLevel.LOW
        elif score < 50:
            return RiskLevel.MEDIUM
        elif score < 75:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL

    @classmethod
    def evaluate_persona_risk(cls, persona_id: str, signals: Dict[str, float]) -> PersonaRisk:
        factors = []
        total_score = 0.0

        # Simple additive model with weights
        weights = {
            "deception_profile": 0.4,
            "cross_platform_spread": 0.3,
            "persona_army_patterns": 0.3,
            "watchlist_hit": 0.5 # can push over easily
        }

        for signal_name, value in signals.items():
            weight = weights.get(signal_name, 0.1)
            contribution = value * weight
            total_score += contribution
            factors.append(RiskFactor(
                name=signal_name,
                weight=weight,
                value=value,
                contribution=contribution
            ))

        final_score = min(max(total_score, 0.0), 100.0)
        risk_level = cls.calculate_risk_level(final_score)

        return PersonaRisk(
            persona_id=persona_id,
            risk_score=final_score,
            risk_level=risk_level,
            factors=factors
        )

    @classmethod
    def evaluate_campaign_risk(cls, campaign_id: str, signals: Dict[str, float]) -> CampaignRisk:
        factors = []
        total_score = 0.0

        weights = {
            "target_criticality": 0.4,
            "amplification_volume": 0.3,
            "negative_sentiment": 0.2,
            "executive_targeting": 0.4
        }

        for signal_name, value in signals.items():
            weight = weights.get(signal_name, 0.1)
            contribution = value * weight
            total_score += contribution
            factors.append(RiskFactor(
                name=signal_name,
                weight=weight,
                value=value,
                contribution=contribution
            ))

        final_score = min(max(total_score, 0.0), 100.0)
        risk_level = cls.calculate_risk_level(final_score)

        return CampaignRisk(
            campaign_id=campaign_id,
            risk_score=final_score,
            risk_level=risk_level,
            factors=factors
        )
