import json
import os
import jsonschema

def verify_evidence(evidence_id):
    index_path = "evidence/index.json"
    with open(index_path, 'r') as f:
        index = json.load(f)

    if evidence_id not in index["evidence"]:
        print(f"FAILURE: {evidence_id} not in index.")
        return False

    paths = index["evidence"][evidence_id]
    for key in ["report", "metrics", "stamp"]:
        if key not in paths:
            print(f"FAILURE: Missing path for {key}")
            return False
        if not os.path.exists(paths[key]):
            print(f"FAILURE: File {paths[key]} does not exist.")
            return False

    # Schema validation
    # Use existing schemas if possible
    schemas = {
        "report": "schemas/evidence/report.schema.json",
        "metrics": "schemas/evidence/metrics.schema.json",
        "stamp": "schemas/evidence/stamp.schema.json"
    }

    for key, schema_path in schemas.items():
        with open(paths[key], 'r') as f:
            instance = json.load(f)
        with open(schema_path, 'r') as f:
            schema = json.load(f)
        try:
            jsonschema.validate(instance=instance, schema=schema)
        except jsonschema.exceptions.ValidationError as e:
            print(f"FAILURE: {paths[key]} invalid against {schema_path}: {e.message}")
            return False

    print(f"SUCCESS: {evidence_id} verified.")
    return True

if __name__ == "__main__":
    verify_evidence("EVD-ARCHIMYST-SIM-001")
