import unittest
import json
import os
import sys

# Ensure modules is in path
sys.path.append(os.getcwd())

from modules.agentplace.evaluator import AgentEvaluator, RiskReport

class TestAgentEvaluator(unittest.TestCase):
    def setUp(self):
        # Assuming run from root
        base_dir = os.path.dirname(__file__)
        schema_path = os.path.join(base_dir, '../schemas/agent_manifest.schema.json')
        risk_model_path = os.path.join(base_dir, '../risk_model.yaml')
        self.evaluator = AgentEvaluator(schema_path, risk_model_path)

    def test_valid_manifest_low_risk(self):
        manifest = {
            "name": "TestAgent",
            "version": "1.0.0",
            "owner": "test@example.com",
            "description": "A test agent",
            "capabilities": ["network_access"],
            "permissions": ["read"],
            "data_access": ["public"]
        }
        report = self.evaluator.evaluate(manifest)
        self.assertEqual(report.risk_level, "LOW")
        self.assertEqual(report.governance_action, "APPROVE")

    def test_valid_manifest_high_risk(self):
        manifest = {
            "name": "HighRiskAgent",
            "version": "1.0.0",
            "owner": "admin@example.com",
            "description": "Admin agent",
            "capabilities": ["system_calls"],
            "permissions": ["admin"],
            "data_access": ["pii"]
        }
        report = self.evaluator.evaluate(manifest)
        self.assertEqual(report.risk_level, "HIGH")
        # 50 + 50 + 50 = 150 -> capped at 100 -> REJECT
        self.assertIn(report.governance_action, ["REJECT", "MANUAL_REVIEW"])

    def test_invalid_schema(self):
        manifest = {
            "name": "InvalidAgent"
            # Missing required fields
        }
        # Assuming schema validation handles this
        try:
             report = self.evaluator.evaluate(manifest)
             self.assertEqual(report.risk_level, "CRITICAL")
             self.assertEqual(report.governance_action, "REJECT")
        except Exception as e:
             self.fail(f"Evaluator raised exception: {e}")

if __name__ == '__main__':
    unittest.main()
