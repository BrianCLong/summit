import json
import os
import subprocess
import sys

import jsonschema

# Add root to sys.path to allow importing summit_sim
sys.path.append(os.getcwd())

def load_json(filepath):
    with open(filepath) as f:
        return json.load(f)

def run_command(cmd, msg):
    print(f"Running: {msg}")
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        print(f"FAILED: {msg}")
        return False
    print(f"PASSED: {msg}")
    return True

def validate_evidence_files():
    print("Verifying evidence files against schemas...")
    try:
        index_schema = load_json("schemas/evidence/index.schema.json")
        index_data = load_json("evidence/index.json")
        jsonschema.validate(instance=index_data, schema=index_schema)

        report_schema = load_json("schemas/evidence/report.schema.json")
        metrics_schema = load_json("schemas/evidence/metrics.schema.json")
        stamp_schema = load_json("schemas/evidence/stamp.schema.json")

        # Collect all referenced files to validate
        files_to_validate = []
        for item in index_data.get("items", []):
            if "report" in item:
                files_to_validate.append((item["report"], report_schema))
            if "metrics" in item:
                files_to_validate.append((item["metrics"], metrics_schema))
            if "stamp" in item:
                files_to_validate.append((item["stamp"], stamp_schema))

        # Validate unique files
        validated = set()
        for filepath, schema in files_to_validate:
            if filepath in validated:
                continue
            if not os.path.exists(filepath):
                print(f"WARNING: File {filepath} referenced in index but does not exist.")
                continue

            data = load_json(filepath)
            try:
                jsonschema.validate(instance=data, schema=schema)
                validated.add(filepath)
            except jsonschema.ValidationError as e:
                print(f"FAILED: Validation failed for {filepath}: {e.message}")
                return False

        print("PASSED: Evidence files validation")
        return True
    except Exception as e:
        print(f"FAILED: Evidence validation error: {e}")
        return False

def verify_feature_flags():
    # Check default env vars or config
    try:
        from summit_sim.agents.config import SimConfig
    except ImportError as e:
        print(f"FAILED: Could not import SimConfig: {e}")
        return False

    if SimConfig.use_llm_agents():
        print("FAILED: SIM_LLM_AGENTS should be 0 by default")
        return False
    if SimConfig.use_rag_memory():
        print("FAILED: SIM_RAG_MEMORY should be 0 by default")
        return False
    if SimConfig.use_interventions():
        print("FAILED: SIM_INTERVENTIONS should be 0 by default")
        return False
    print("PASSED: Feature flags default OFF")
    return True

def main():
    steps = [
        ("python -m pytest tests/test_evidence_schemas.py", "Schema Validation"),
        ("python tools/ci/verify_no_timestamp_outside_stamp.py", "Timestamp Check"),
        ("python -m pytest tests/test_state_machine_deny_by_default.py", "Deny-by-Default Tests"),
        ("python -m pytest tests/test_prompt_injection_memory_boundary.py", "Security Boundary Tests"),
    ]

    success = True
    for cmd, msg in steps:
        if not run_command(cmd, msg):
            success = False

    if not validate_evidence_files():
        success = False

    if not verify_feature_flags():
        success = False

    if success:
        print("ALL BUNDLE VERIFICATION PASSED")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
