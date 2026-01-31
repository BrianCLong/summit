import importlib.util
import json
import os
import re
import sys
from pathlib import Path

# Try to import jsonschema
try:
    import jsonschema
    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False

def main():
    root = Path(__file__).parent.parent.parent
    evidence_dir = root / "evidence"

    errors = []

    # 1. Verify Evidence Index and IDs
    index_path = evidence_dir / "index.json"
    if not index_path.exists():
        errors.append(f"{index_path} missing")
        index = {} # Define index to prevent UnboundLocalError
    else:
        try:
            with open(index_path) as f:
                index = json.load(f)
        except json.JSONDecodeError:
            errors.append("evidence/index.json is invalid JSON")
            index = {}

        acp_ids = [
            "EVD-copilotcliacp-PROTO-001",
            "EVD-copilotcliacp-SEC-001",
            "EVD-copilotcliacp-E2E-001"
        ]

        found_ids = set()
        for item in index.get("items", []):
            if item.get("id") in acp_ids:
                found_ids.add(item["id"])
                # Verify referenced files exist
                for fpath in item.get("files", []):
                    full_path = root / fpath
                    if not full_path.exists():
                        errors.append(f"Referenced file {fpath} missing for {item['id']}")

        missing = set(acp_ids) - found_ids
        if missing:
            errors.append(f"Missing evidence IDs in index: {missing}")

    # 2. Schema Validation (if jsonschema available)
    if HAS_JSONSCHEMA and index:
        # Validate index
        schema_path = evidence_dir / "schemas" / "acp_index.schema.json"
        if schema_path.exists():
            try:
                with open(schema_path) as f:
                    schema = json.load(f)
                jsonschema.validate(instance=index, schema=schema)
            except Exception as e:
                errors.append(f"Index schema validation failed: {e}")

        # Validate artifacts
        # We need to map ID to schema, or file to schema.
        # For this task, we know the mapping.
        artifact_map = {
            "evidence/acp_report.json": "evidence/schemas/acp_report.schema.json",
            "evidence/acp_metrics.json": "evidence/schemas/acp_metrics.schema.json",
            "evidence/acp_stamp.json": "evidence/schemas/acp_stamp.schema.json"
        }
        for artifact_rel, schema_rel in artifact_map.items():
            artifact_path = root / artifact_rel
            schema_path = root / schema_rel
            if artifact_path.exists() and schema_path.exists():
                try:
                    with open(artifact_path) as fa, open(schema_path) as fs:
                        inst = json.load(fa)
                        sch = json.load(fs)
                        jsonschema.validate(instance=inst, schema=sch)
                except Exception as e:
                    errors.append(f"Schema validation failed for {artifact_rel}: {e}")
    elif not HAS_JSONSCHEMA:
        print("WARNING: jsonschema not installed, skipping schema validation")

    # 3. Timestamp Isolation
    # Check that report and metrics do not contain ISO timestamps
    iso_timestamp_re = re.compile(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')

    files_to_check = ["evidence/acp_report.json", "evidence/acp_metrics.json"]
    for frel in files_to_check:
        fpath = root / frel
        if fpath.exists():
            with open(fpath) as f:
                content = f.read()
                if iso_timestamp_re.search(content):
                    errors.append(f"Timestamp found in {frel}. Timestamps must be isolated to stamp.json")

    # 4. Deny-by-default Tests Existence
    required_tests = [
        "test_headless_deny_all",
        "test_interactive_allowlist",
        "test_interactive_url_allowlist"
    ]
    test_file = root / "tests" / "policy" / "test_permission_broker.py"
    if not test_file.exists():
         errors.append(f"Test file {test_file} missing")
    else:
        with open(test_file) as f:
            content = f.read()
            for tname in required_tests:
                if f"def {tname}" not in content:
                    errors.append(f"Missing required test: {tname} in {test_file}")

    # 5. Flags Default OFF
    flags_path = root / "summit" / "config" / "flags.py"
    if not flags_path.exists():
        errors.append("summit/config/flags.py missing")
    else:
        # Import flags dynamically
        spec = importlib.util.spec_from_file_location("summit.config.flags", flags_path)
        flags = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(flags)
        if getattr(flags, "SUMMIT_ACP_ENABLE", True) is not False:
            errors.append("SUMMIT_ACP_ENABLE must be False by default")

    if errors:
        for e in errors:
            print(f"ERROR: {e}")
        sys.exit(1)

    print("SUCCESS: ACP bundle verified.")

if __name__ == "__main__":
    main()
