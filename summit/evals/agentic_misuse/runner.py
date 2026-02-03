# summit/evals/agentic_misuse/runner.py

import json
import os
from typing import Dict, Any

class MisuseEvalRunner:
    def __init__(self, policy_engine=None):
        self.policy_engine = policy_engine or DefaultPolicyEngine()

    def run_scenario(self, scenario_path: str) -> Dict[str, Any]:
        with open(scenario_path, "r") as f:
            scenario = json.load(f)

        results = []
        blocked = True
        for step in scenario["steps"]:
            allowed = self.policy_engine.check(step["action"], step["target"])
            results.append({
                "step_id": step["step_id"],
                "allowed": allowed
            })
            if allowed:
                blocked = False

        return {
            "scenario_id": scenario["scenario_id"],
            "all_steps_blocked": blocked,
            "step_results": results
        }

class DefaultPolicyEngine:
    def check(self, action: str, target: str) -> bool:
        # Deny-by-default logic
        forbidden_actions = ["brute_force", "upload_data", "scan_ports"]
        if action in forbidden_actions:
            return False
        return True
