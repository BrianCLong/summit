"""Generates policies for the policy-fuzzer."""

import random
from datetime import datetime, timedelta
from policy_parser import parse_policy_definition

# Sample policy definition in YAML format
SAMPLE_POLICY_DEFINITION = """
rules:
  - effect: allow
    condition:
      AND:
        - consent: user_data
        - geo: US
        - OR:
            - license: license_A
            - license: license_B
        - retention: { greater_than: 30d }
        - start_date: { less_than: 2024-01-01T00:00:00 }
        - NOT:
            - is_sensitive: true
  - effect: deny
    condition:
      geo: EU
"""

def generate_policy():
    """Generates a policy from a predefined definition."""
    # For now, we return the parsed policy definition directly.
    # In a future iteration, this could involve dynamically generating policies
    # based on the enhanced policy definition structure.
    parsed_definition = parse_policy_definition(SAMPLE_POLICY_DEFINITION)
    if parsed_definition:
        # The policy_data itself is the dictionary that the evaluator will use
        # to check against the query.
        policy_data = {}
        for rule in parsed_definition.get("rules", []):
            for key, value in rule.get("condition", {}).items():
                # This is a simplified way to extract policy data for the fuzzer.
                # A more robust solution would involve a dedicated policy object.
                if key not in ["AND", "OR", "NOT"]:
                    policy_data[key] = value
        return policy_data
    return {} # Return an empty policy if parsing fails
