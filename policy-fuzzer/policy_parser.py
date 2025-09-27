"""A simple policy parser for structured policy definitions."""

import yaml

def parse_policy_definition(policy_string):
    """Parses a policy definition string (YAML format) into a Python dictionary."""
    try:
        policy_data = yaml.safe_load(policy_string)
        return policy_data
    except yaml.YAMLError as e:
        print(f"Error parsing policy YAML: {e}")
        return None

def generate_policy_from_definition(policy_definition):
    """Generates a policy dictionary from a structured policy definition."""
    # This is a placeholder. In a real scenario, this would involve more complex logic
    # to interpret the policy_definition and construct a policy suitable for fuzzing.
    policy = {}
    if "rules" in policy_definition:
        for rule in policy_definition["rules"]:
            if "effect" in rule and "condition" in rule:
                # For simplicity, let's assume a direct mapping for now
                # e.g., condition: {consent: user_data} -> policy["consent"] = "user_data"
                for key, value in rule["condition"].items():
                    policy[key] = value
    return policy
