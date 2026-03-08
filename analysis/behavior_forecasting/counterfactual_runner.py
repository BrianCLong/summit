import json
import os
from copy import deepcopy

def perturb_tool_latency(scenario, multiplier):
    """Mutate tool latency in a scenario."""
    mutated = deepcopy(scenario)
    if "env" not in mutated:
        mutated["env"] = {}

    mutated["env"]["tool_latency_multiplier"] = multiplier
    return mutated

def perturb_policy_constraint(scenario, new_constraint):
    """Mutate a policy constraint inside a scenario for robustness testing."""
    mutated = deepcopy(scenario)
    if "env" not in mutated:
        mutated["env"] = {}

    mutated["env"]["policy_constraint"] = new_constraint
    return mutated

def run_counterfactual_suite(base_scenario, output_dir="artifacts/behavior-forecasting"):
    os.makedirs(output_dir, exist_ok=True)

    mutations = [
        {"name": "latency_x2", "scenario": perturb_tool_latency(base_scenario, 2.0)},
        {"name": "latency_x5", "scenario": perturb_tool_latency(base_scenario, 5.0)},
        {"name": "strict_policy", "scenario": perturb_policy_constraint(base_scenario, "strict")},
    ]

    with open(os.path.join(output_dir, "counterfactuals.json"), "w") as f:
        json.dump(mutations, f, indent=2)

    return mutations
