"""Generates policies for the policy-fuzzer."""

import random
import os
import yaml
from datetime import datetime, timedelta
from policy_parser import parse_policy_definition

POLICY_TEMPLATES_DIR = "policy-fuzzer/policy_templates"

# Define lists of possible values for policy fields
CONSENT_TYPES = ["user_data", "marketing", "analytics"]
GEO_LOCATIONS = ["US", "EU", "CA", "ANY"]
LICENSE_TYPES = ["license_A", "license_B", None]
RETENTION_PERIODS = ["30d", "90d", "1y", None]
USER_ROLES = ["admin", "analyst", "guest"]
NETWORK_CONDITIONS = ["secure", "unsecure", "vpn"]
DATA_CLASSIFICATIONS = ["sensitive_data", "public_data", "user_data"]
PURPOSES = ["investigation", "threat-intel", "marketing", "analytics"]

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
    """Generates a policy by randomly selecting and combining policy templates, with dynamic value generation and structural variations."""
    if not LOADED_POLICY_TEMPLATES:
        return {} # No templates available

    # Randomly select a subset of templates to combine
    num_templates_to_combine = random.randint(1, len(LOADED_POLICY_TEMPLATES))
    selected_templates = random.sample(LOADED_POLICY_TEMPLATES, num_templates_to_combine)

    combined_rules = []
    for template in selected_templates:
        for rule in template.get("rules", []):
            modified_rule = rule.copy()
            # Randomly change effect
            if random.random() < 0.2: # 20% chance to flip effect
                modified_rule["effect"] = "deny" if modified_rule.get("effect", "allow") == "allow" else "allow"

            # Dynamically generate values for conditions
            if "condition" in modified_rule:
                modified_rule["condition"] = _randomize_conditions(modified_rule["condition"])

            # Randomly add/remove conditions (simplified for now)
            if random.random() < 0.1 and len(modified_rule["condition"]) > 1:
                key_to_remove = random.choice(list(modified_rule["condition"].keys()))
                modified_rule["condition"].pop(key_to_remove)

            combined_rules.append(modified_rule)

    combined_policy_definition = {"rules": combined_rules}

    parsed_definition = parse_policy_definition(yaml.dump(combined_policy_definition))
    if parsed_definition:
        policy_data = {}
        # Extract policy data for the oracle (simplified)
        for rule in parsed_definition.get("rules", []):
            policy_data.update(_extract_policy_data_from_conditions(rule.get("condition", {})))
            if "effect" in rule:
                policy_data["effect"] = rule["effect"]
        return policy_data
    return {} # Return an empty policy if parsing fails

def _randomize_conditions(conditions):
    """Recursively randomizes values within policy conditions."""
    if isinstance(conditions, dict):
        new_conditions = {}
        for key, value in conditions.items():
            if key in ["AND", "OR", "NOT"]:
                new_conditions[key] = [_randomize_conditions(v) for v in value]
            elif key == "consent":
                new_conditions[key] = random.choice(CONSENT_TYPES)
            elif key == "geo":
                new_conditions[key] = random.choice(GEO_LOCATIONS)
            elif key == "license":
                new_conditions[key] = random.choice(LICENSE_TYPES)
            elif key == "retention":
                new_conditions[key] = random.choice(RETENTION_PERIODS)
            elif key == "user_role":
                new_conditions[key] = random.choice(USER_ROLES)
            elif key == "network_condition":
                new_conditions[key] = random.choice(NETWORK_CONDITIONS)
            elif key == "data":
                new_conditions[key] = random.choice(DATA_CLASSIFICATIONS)
            elif key == "purpose":
                new_conditions[key] = random.choice(PURPOSES)
            elif key == "start_date" or key == "end_date":
                # Generate random dates within a reasonable range
                random_date = datetime.now() + timedelta(days=random.randint(-365, 365))
                new_conditions[key] = random_date.isoformat()
            else:
                new_conditions[key] = value # Keep original value if not randomized
        return new_conditions
    return conditions

def _extract_policy_data_from_conditions(conditions):
    """Recursively extracts simple key-value pairs from conditions for the policy data."""
    policy_data = {}
    if isinstance(conditions, dict):
        for key, value in conditions.items():
            if key in ["AND", "OR", "NOT"]:
                for sub_condition in value:
                    policy_data.update(_extract_policy_data_from_conditions(sub_condition))
            elif isinstance(value, dict):
                # Handle operators like { greater_than: 30d }
                # For simplicity, just store the first value found
                policy_data[key] = list(value.values())[0]
            else:
                policy_data[key] = value
    return policy_data
