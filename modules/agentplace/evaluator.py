import json
import yaml
import os
import jsonschema
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional

@dataclass
class RiskReport:
    score: int
    risk_level: str
    violations: List[str]
    governance_action: str
    breakdown: Dict[str, int]

    def to_dict(self):
        return asdict(self)

class AgentEvaluator:
    def __init__(self, schema_path: str = None, risk_model_path: str = None):
        base_dir = os.path.dirname(__file__)
        if schema_path is None:
            schema_path = os.path.join(base_dir, 'schemas', 'agent_manifest.schema.json')
        if risk_model_path is None:
            risk_model_path = os.path.join(base_dir, 'risk_model.yaml')

        with open(schema_path, 'r') as f:
            self.schema = json.load(f)
        with open(risk_model_path, 'r') as f:
            self.risk_model = yaml.safe_load(f)

    def evaluate(self, manifest: Dict[str, Any]) -> RiskReport:
        # Validate schema
        try:
            jsonschema.validate(instance=manifest, schema=self.schema)
        except jsonschema.ValidationError as e:
            return RiskReport(
                score=100,
                risk_level="CRITICAL",
                violations=[f"Schema validation failed: {e.message}"],
                governance_action="REJECT",
                breakdown={}
            )

        # Calculate score
        score = 0
        breakdown = {}
        violations = []

        # Capabilities
        cap_weight = self.risk_model.get('risk_weights', {}).get('capabilities', {})
        for cap in manifest.get('capabilities', []):
            w = cap_weight.get(cap, 0)
            score += w
            breakdown[f"capability:{cap}"] = w

        # Permissions
        perm_weight = self.risk_model.get('risk_weights', {}).get('permissions', {})
        for perm in manifest.get('permissions', []):
            w = perm_weight.get(perm, 0)
            score += w
            breakdown[f"permission:{perm}"] = w

        # Data Access
        data_weight = self.risk_model.get('risk_weights', {}).get('data_access', {})
        for data in manifest.get('data_access', []):
            w = data_weight.get(data, 0)
            score += w
            breakdown[f"data_access:{data}"] = w

        # Normalize score (0-100 cap)
        final_score = min(100, score)

        # Determine level
        thresholds = self.risk_model.get('thresholds', {})
        if final_score >= thresholds.get('high', 80):
            level = "HIGH"
        elif final_score >= thresholds.get('medium', 50):
            level = "MEDIUM"
        else:
            level = "LOW"

        # Governance Action
        gov = self.risk_model.get('governance', {})
        if final_score >= gov.get('auto_reject_above', 90):
            action = "REJECT"
            violations.append(f"Score {final_score} exceeds auto-reject threshold {gov.get('auto_reject_above', 90)}")
        elif final_score >= gov.get('require_manual_approval_above', 50):
            action = "MANUAL_REVIEW"
        else:
            action = "APPROVE"

        return RiskReport(
            score=final_score,
            risk_level=level,
            violations=violations,
            governance_action=action,
            breakdown=breakdown
        )
