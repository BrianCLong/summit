import hashlib
import json
import os

def get_file_hash(filepath):
    if not os.path.exists(filepath):
        return "MISSING"
    with open(filepath, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()

def main():
    report = {
        "openapi_spec": get_file_hash("api-schemas/factapi_pro/openapi.yaml"),
        "quota_config": get_file_hash("api/factapi_pro/storage/memory_store.py"),
        "standards_doc": get_file_hash("docs/standards/factapi-pro.md"),
        "ci_mapping": get_file_hash("docs/ci/factapi-pro-ci-mapping.md")
    }

    # Deterministic output (sort keys)
    with open("scripts/monitoring/factapi-pro-drift.report.json", "w") as f:
        json.dump(report, f, indent=2, sort_keys=True)

    print("Drift report generated: scripts/monitoring/factapi-pro-drift.report.json")

if __name__ == "__main__":
    main()
