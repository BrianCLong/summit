"""Generates policies for the policy-fuzzer."""

import random
from datetime import datetime, timedelta
from policy_parser import parse_policy_definition, generate_policy_from_definition

# Sample policy definition in YAML format
SAMPLE_POLICY_DEFINITION = """
rules:
  - effect: allow
    condition:
      consent: user_data
      geo: US
      license: license_A
      retention: 30d
      start_date: 2023-01-01T00:00:00
      end_date: 2023-12-31T23:59:59
"""

def generate_policy():
    """Generates a policy from a predefined definition."""
    parsed_definition = parse_policy_definition(SAMPLE_POLICY_DEFINITION)
    if parsed_definition:
        return generate_policy_from_definition(parsed_definition)
    return {} # Return an empty policy if parsing fails
