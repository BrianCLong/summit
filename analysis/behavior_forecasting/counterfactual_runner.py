from copy import deepcopy

def perturb_tool_latency(scenario, multiplier):
    mutated = deepcopy(scenario)
    if "env" not in mutated:
        mutated["env"] = {}
    mutated["env"]["tool_latency_multiplier"] = multiplier
    return mutated

def perturb_context_window(scenario, drop_history_ratio):
    mutated = deepcopy(scenario)
    return mutated
