import json
import os
from typing import Any, Dict, List

import jsonschema
import yaml


class AgentPlaceEvaluator:
    def __init__(self, risk_model_path: str, schema_path: str):
        with open(risk_model_path) as f:
            self.risk_model = yaml.safe_load(f)
        with open(schema_path) as f:
            self.schema = json.load(f)

    def validate_manifest(self, manifest: dict[str, Any]):
        jsonschema.validate(instance=manifest, schema=self.schema)

    def evaluate(self, manifest: dict[str, Any]) -> dict[str, Any]:
        self.validate_manifest(manifest)

        score = 0
        findings = []

        # 1. Capability Risk
        for cap in manifest.get('capabilities', []):
            if cap in self.risk_model.get('high_autonomy_capabilities', []):
                penalty = self.risk_model['weights']['high_autonomy_capability']
                score += penalty
                findings.append(f"High autonomy capability detected: {cap} (+{penalty})")
            elif cap not in self.risk_model.get('allowlisted_capabilities', []):
                penalty = self.risk_model['weights']['unrecognized_capability']
                score += penalty
                findings.append(f"Unrecognized capability detected: {cap} (+{penalty})")

        # 2. Scope Risk
        if len(manifest.get('api_scopes', [])) > 5:
            penalty = self.risk_model['weights']['excessive_scopes']
            score += penalty
            findings.append(f"Excessive API scopes (>5): {len(manifest['api_scopes'])} (+{penalty})")

        # 3. Interaction Risk
        for intent in manifest.get('interaction_intents', []):
            if not intent.get('purpose'):
                penalty = self.risk_model['weights']['missing_interaction_purpose']
                score += penalty
                findings.append(f"Missing purpose for interaction with {intent.get('target')} (+{penalty})")

        # 4. Data Risk
        if 'restricted' in manifest.get('data_classifications', []):
            penalty = self.risk_model['weights']['restricted_data_access']
            score += penalty
            findings.append(f"Restricted data classification requested (+{penalty})")

        score = min(100, score)

        risk_tier = "low"
        if score >= self.risk_model['thresholds']['high']:
            risk_tier = "high"
        elif score >= self.risk_model['thresholds']['medium']:
            risk_tier = "medium"

        # Threat model mappings (ITEM:CLAIM-01 to ITEM:CLAIM-05)
        return {
            "module": "agentplace",
            "agent_name": manifest['name'],
            "risk_score": score,
            "risk_tier": risk_tier,
            "findings": findings,
            "evidence_ids": [f"EVID-AGENTPLACE-{manifest['name'].upper()}"],
            "deterministic": True,
            "compliance": {
                "rogue_execution_mitigated": "system-modification" not in manifest.get('capabilities', []),
                "api_abuse_mitigated": len(manifest.get('api_scopes', [])) <= 5,
                "fraud_mitigated": all(i.get('purpose') for i in manifest.get('interaction_intents', [])),
                "exfiltration_mitigated": "restricted" not in manifest.get('data_classifications', [])
            }
        }

def main():
    import argparse
    parser = argparse.ArgumentParser(description="AgentPlace Risk Evaluator")
    parser.add_argument("--manifest", required=True, help="Path to agent manifest JSON")
    parser.add_argument("--output", default="report.json", help="Path to output report")
    args = parser.parse_args()

    base_dir = os.path.dirname(__file__)
    risk_model_path = os.path.join(base_dir, "risk_model.yaml")
    schema_path = os.path.join(base_dir, "schemas", "agent_manifest.schema.json")

    evaluator = AgentPlaceEvaluator(risk_model_path, schema_path)

    with open(args.manifest) as f:
        manifest = json.load(f)

    report = evaluator.evaluate(manifest)

    output_dir = os.path.dirname(args.output)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    with open(args.output, 'w') as f:
        json.dump(report, f, indent=2)

    # Generate stamp.json
    stamp = {
        "module": "agentplace",
        "version": "0.1.0",
        "evidence_ids": report["evidence_ids"],
        "deterministic": True
    }
    stamp_path = os.path.join(output_dir if output_dir else ".", "stamp.json")
    with open(stamp_path, 'w') as f:
        json.dump(stamp, f, indent=2)

    print(f"Evaluation complete. Risk Score: {report['risk_score']} ({report['risk_tier']})")

if __name__ == "__main__":
    main()
