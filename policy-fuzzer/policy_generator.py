"""Generates policies for the policy-fuzzer."""

import random
import os
import yaml
from datetime import datetime, timedelta
from policy_parser import parse_policy_definition

POLICY_TEMPLATES_DIR = "policy-fuzzer/policy_templates"

def load_policy_templates():
    templates = []
    for filename in os.listdir(POLICY_TEMPLATES_DIR):
        if filename.endswith(".yaml"):
            filepath = os.path.join(POLICY_TEMPLATES_DIR, filename)
            with open(filepath, 'r') as f:
                templates.append(yaml.safe_load(f))
    return templates

LOADED_POLICY_TEMPLATES = load_policy_templates()

def generate_policy():
    """Generates a policy by randomly selecting and combining policy templates."""
    if not LOADED_POLICY_TEMPLATES:
        return {} # No templates available

    # Randomly select a subset of templates to combine
    num_templates_to_combine = random.randint(1, len(LOADED_POLICY_TEMPLATES))
    selected_templates = random.sample(LOADED_POLICY_TEMPLATES, num_templates_to_combine)

    combined_rules = []
    for template in selected_templates:
        combined_rules.extend(template.get("rules", []))

    combined_policy_definition = {"rules": combined_rules}

    parsed_definition = parse_policy_definition(yaml.dump(combined_policy_definition))
    if parsed_definition:
        policy_data = {}
        for rule in parsed_definition.get("rules", []):
            for key, value in rule.get("condition", {}).items():
                if key not in ["AND", "OR", "NOT"]:
                    policy_data[key] = value
        return policy_data
    return {} # Return an empty policy if parsing fails
