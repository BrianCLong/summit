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
    """Generates a callable policy evaluator from a structured policy definition."""

    def evaluate_condition(condition, policy_data, query_data):
        if "AND" in condition:
            return all(evaluate_condition(c, policy_data, query_data) for c in condition["AND"])
        if "OR" in condition:
            return any(evaluate_condition(c, policy_data, query_data) for c in condition["OR"])
        if "NOT" in condition:
            return not evaluate_condition(condition["NOT"], policy_data, query_data)

        # Handle individual conditions
        for key, value_def in condition.items():
            # Resolve field from query or policy
            # For now, assume conditions refer to policy fields
            # In a more advanced system, this would resolve against both policy and query context
            actual_value = policy_data.get(key)

            if isinstance(value_def, dict):
                if "equals" in value_def:
                    if actual_value != value_def["equals"]:
                        return False
                elif "greater_than" in value_def:
                    if not (actual_value is not None and actual_value > value_def["greater_than"]):
                        return False
                elif "less_than" in value_def:
                    if not (actual_value is not None and actual_value < value_def["less_than"]):
                        return False
                elif "contains" in value_def:
                    if not (actual_value is not None and value_def["contains"] in actual_value):
                        return False
                # Add more operators as needed
            else:
                # Default to equals if no operator specified
                if actual_value != value_def:
                    return False
        return True

    def policy_evaluator(policy_data, query_data):
        for rule in policy_definition.get("rules", []):
            effect = rule.get("effect", "allow") # Default effect is allow
            condition = rule.get("condition", {})

            if evaluate_condition(condition, policy_data, query_data):
                return effect == "allow"
        return True # Default to allow if no rules match

    return policy_evaluator
