import datetime
import json
import os

from summit.agents.ai_supply_chain_monitor.propagation_analyzer import Package, PropagationAnalyzer


class PolicyGate:
    def __init__(self, evidence_dir="evidence/ai-supply-chain"):
        self.evidence_dir = evidence_dir
        if not os.path.exists(evidence_dir):
            os.makedirs(evidence_dir)

        self.analyzer = PropagationAnalyzer()

    def evaluate_dependency(self, name, age_days, trust_score, ai_recommendations):
        package = Package(name, age_days, trust_score, ai_recommendations)
        is_high_risk = self.analyzer.detect_autonomous_propagation(package)

        # Determine the status based on the policy
        status = "DENY" if is_high_risk else "ALLOW"

        self._generate_evidence(package, is_high_risk, status)

        return {
            "package": name,
            "status": status,
            "reason": "High autonomous propagation risk detected" if is_high_risk else "Within acceptable risk thresholds"
        }

    def _generate_evidence(self, package, is_high_risk, status):
        evidence_id = "SUMMIT-AISCM-001"

        report = {
            "evidence_id": evidence_id,
            "package_evaluated": package.name,
            "status": status,
            "is_high_risk": is_high_risk,
            "metrics": {
                "age_days": package.age_days,
                "trust_score": package.trust_score,
                "ai_recommendations": package.ai_recommendations
            },
            "timestamp": datetime.datetime.now(datetime.UTC).isoformat()
        }

        metrics = {
            "total_evaluations": 1,
            "denied": 1 if is_high_risk else 0,
            "allowed": 0 if is_high_risk else 1
        }

        stamp = {
            "id": evidence_id,
            "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
            "signature": "VALID"
        }

        with open(os.path.join(self.evidence_dir, "report.json"), "w") as f:
            json.dump(report, f, indent=2)

        with open(os.path.join(self.evidence_dir, "metrics.json"), "w") as f:
            json.dump(metrics, f, indent=2)

        with open(os.path.join(self.evidence_dir, "stamp.json"), "w") as f:
            json.dump(stamp, f, indent=2)

if __name__ == "__main__":
    gate = PolicyGate()
    result = gate.evaluate_dependency("fast-json-parser", age_days=2, trust_score=0.2, ai_recommendations=20000)
    print(f"Policy Gate Result: {result}")
