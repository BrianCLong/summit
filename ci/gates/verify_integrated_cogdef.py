import json
import os
import sys
import jsonschema

def validate_evidence():
    print("Validating evidence/plassf/index.json...")
    index_path = "evidence/plassf/index.json"
    if not os.path.exists(index_path):
        print(f"Error: {index_path} does not exist.")
        return False

    with open(index_path, 'r') as f:
        data = json.load(f)

    if data.get("item") != "PLASSFCOG":
        print("Error: Item is not PLASSFCOG")
        return False

    evidence_map = data.get("evidence", {})
    if not evidence_map:
        print("Error: No evidence mapped")
        return False

    for evd_id, files in evidence_map.items():
        for filepath in files:
            if not os.path.exists(filepath):
                print(f"Error: Mapped file {filepath} does not exist (for {evd_id})")
                return False
    print("Evidence pack validated.")
    return True

def validate_model():
    print("Validating adversary model...")
    model_path = "packages/integrated-cogdef/models/adversary_integrator.json"
    schema_path = "packages/integrated-cogdef/schemas/adversary_integrator.schema.json"

    if not os.path.exists(model_path) or not os.path.exists(schema_path):
        print("Error: Model or schema file missing.")
        return False

    with open(model_path, 'r') as f:
        model = json.load(f)
    with open(schema_path, 'r') as f:
        schema = json.load(f)

    try:
        jsonschema.validate(instance=model, schema=schema)
        print("Adversary model validated.")
        return True
    except jsonschema.ValidationError as e:
        print(f"Validation error: {e}")
        return False

def validate_guardrails():
    print("Validating guardrails...")
    schema_path = "packages/integrated-cogdef/schemas/guardrails.schema.json"
    neg_fixture = "policy/gates/integrated-cogdef/fixtures/guardrails_negative.json"
    pos_fixture = "policy/gates/integrated-cogdef/fixtures/guardrails_positive.json"

    with open(schema_path, 'r') as f:
        schema = json.load(f)

    # Positive test
    with open(pos_fixture, 'r') as f:
        pos_data = json.load(f)
    try:
        jsonschema.validate(instance=pos_data, schema=schema)
        print("Positive fixture passed.")
    except jsonschema.ValidationError as e:
        print(f"Error: Positive fixture failed validation: {e}")
        return False

    # Negative test
    with open(neg_fixture, 'r') as f:
        neg_data = json.load(f)
    try:
        jsonschema.validate(instance=neg_data, schema=schema)
        print("Error: Negative fixture passed validation (should have failed).")
        return False
    except jsonschema.ValidationError:
        print("Negative fixture failed validation as expected.")

    return True

def validate_iw_pack():
    print("Validating IW pack...")
    schema_path = "packages/integrated-cogdef/schemas/iw_pack.schema.json"
    neg_fixture = "policy/gates/integrated-cogdef/fixtures/iw_negative.json"
    pos_fixture = "policy/gates/integrated-cogdef/fixtures/iw_positive.json"

    with open(schema_path, 'r') as f:
        schema = json.load(f)

    # Positive test
    with open(pos_fixture, 'r') as f:
        pos_data = json.load(f)
    try:
        jsonschema.validate(instance=pos_data, schema=schema)
        print("Positive IW fixture passed.")
    except jsonschema.ValidationError as e:
        print(f"Error: Positive IW fixture failed validation: {e}")
        return False

    # Negative test
    with open(neg_fixture, 'r') as f:
        neg_data = json.load(f)
    try:
        jsonschema.validate(instance=neg_data, schema=schema)
        print("Error: Negative IW fixture passed validation (should have failed).")
        return False
    except jsonschema.ValidationError:
        print("Negative IW fixture failed validation as expected.")

    return True

def main():
    steps = [validate_evidence, validate_model, validate_guardrails, validate_iw_pack]
    success = True
    for step in steps:
        if not step():
            success = False
            print(f"Step {step.__name__} failed.")

    if success:
        print("All gates passed.")
        sys.exit(0)
    else:
        print("Some gates failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
