#!/usr/bin/env python3
import os
import sys
import yaml
import json
from jsonschema import validate, ValidationError

SCHEMA_PATH = "summit/assurance/agent_deployment/schemas/agent_scope.schema.json"

def check_scope(filepath):
    if not os.path.exists(filepath):
        print(f"FAIL: Missing {filepath} for AI agent deployment (ITEM:CLAIM-02)")
        return False

    with open(filepath, 'r') as f:
        try:
            data = yaml.safe_load(f)
        except yaml.YAMLError as e:
            print(f"FAIL: Failed to parse {filepath}: {e}")
            return False

    with open(SCHEMA_PATH, 'r') as f:
        schema = json.load(f)

    try:
        validate(instance=data, schema=schema)
    except ValidationError as e:
        print(f"FAIL: {filepath} validation failed: {e.message}")
        return False

    # Extra checks for explicit content as per requirements
    if not data.get("inputs"):
        print(f"FAIL: {filepath} must have explicit inputs")
        return False
    if not data.get("outputs"):
        print(f"FAIL: {filepath} must have explicit outputs")
        return False
    if not data.get("out_of_scope"):
        print(f"FAIL: {filepath} must have explicit out-of-scope boundaries")
        return False

    print(f"PASS: {filepath} is valid.")
    return True

def main():
    # In a real CI, we would detect if this PR introduces an agent.
    # For now, we'll check a list of expected files or a default path.
    target_file = "agent_scope.yaml"

    # If AGENT_DEPLOYMENT_ENFORCEMENT is off, we might skip.
    # Default is OFF as per roll-forward plan.
    enforce = os.getenv("AGENT_DEPLOYMENT_ENFORCEMENT", "off")
    if enforce != "on":
        print("AGENT_DEPLOYMENT_ENFORCEMENT is not enabled. Skipping.")
        sys.exit(0)

    # Heuristic: if any agent-related files are changed, we require agent_scope.yaml
    # This is a simplified version for the sandbox.
    if not check_scope(target_file):
        sys.exit(1)

if __name__ == "__main__":
    main()
