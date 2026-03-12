from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict

class RiskLevel(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

@dataclass
class RiskFactor:
    name: str
    weight: float
    value: float
    contribution: float

@dataclass
class PersonaRisk:
    persona_id: str
    risk_score: float
    risk_level: RiskLevel
    factors: List[RiskFactor] = field(default_factory=list)

@dataclass
class CampaignRisk:
    campaign_id: str
    risk_score: float
    risk_level: RiskLevel
    factors: List[RiskFactor] = field(default_factory=list)

def determine_risk_level(score: float) -> RiskLevel:
    if score < 25:
        return RiskLevel.LOW
    elif score < 50:
        return RiskLevel.MEDIUM
    elif score < 75:
        return RiskLevel.HIGH
    else:
        return RiskLevel.CRITICAL

def _calculate_score_and_factors(signals: List[Dict]) -> tuple[float, List[RiskFactor]]:
    factors = []
    total_score = 0.0
    for signal in signals:
        name = signal.get("name", "unknown")
        weight = signal.get("weight", 1.0)
        value = signal.get("value", 0.0)
        contribution = weight * value

        factor = RiskFactor(name=name, weight=weight, value=value, contribution=contribution)
        factors.append(factor)
        total_score += contribution

    # cap score at 100
    final_score = min(max(total_score, 0.0), 100.0)
    return final_score, factors

def calculate_persona_risk(persona_id: str, signals: List[Dict]) -> PersonaRisk:
    score, factors = _calculate_score_and_factors(signals)
    level = determine_risk_level(score)
    return PersonaRisk(
        persona_id=persona_id,
        risk_score=score,
        risk_level=level,
        factors=factors
    )

def calculate_campaign_risk(campaign_id: str, signals: List[Dict]) -> CampaignRisk:
    score, factors = _calculate_score_and_factors(signals)
    level = determine_risk_level(score)
    return CampaignRisk(
        campaign_id=campaign_id,
        risk_score=score,
        risk_level=level,
        factors=factors
    )
