import json
import os
import sys
import hashlib
from typing import List

# Ensure project root is in path
sys.path.append(os.getcwd())

from summit.vuln.ingest.osv_client import OSVClient
from summit.vuln.normalize.osv_to_vuln_record import osv_to_vuln_record
from summit.flags import SUMMIT_VULN_OSV_SHADOW

def main():
    if not SUMMIT_VULN_OSV_SHADOW:
        print("SUMMIT_VULN_OSV_SHADOW is disabled. Exiting.")
        return

    # In a real scenario, we might take package list from an SBOM
    packages = [
        {"name": "requests", "ecosystem": "PyPI"},
        {"name": "fastapi", "ecosystem": "PyPI"}
    ]

    client = OSVClient()
    all_records = []

    # Deterministic evidence ID based on package names
    pkg_str = ",".join(sorted([p["name"] for p in packages]))
    evidence_id = f"EVID-hand-cve-private-sector-{hashlib.sha256(pkg_str.encode()).hexdigest()[:8]}"

    for pkg in packages:
        print(f"Ingesting OSV for {pkg['name']}...")
        vulns = client.query_by_package(pkg['name'], pkg['ecosystem'])
        for v in vulns:
            # The query_by_package returns summary, we might want full record
            full_v = client.get_vuln_by_id(v['id'])
            if full_v:
                record = osv_to_vuln_record(full_v, evidence_id)
                all_records.append(record)

    # Output artifacts
    output_dir = "artifacts/vuln-intel/hand-cve-private-sector"
    os.makedirs(output_dir, exist_ok=True)

    # vuln_records.jsonl
    with open(f"{output_dir}/vuln_records.jsonl", "w") as f:
        for rec in all_records:
            f.write(rec.model_dump_json() + "\n")

    # metrics.json (Deterministic)
    metrics = {
        "total_records": len(all_records),
        "sources": ["OSV"]
    }
    with open(f"{output_dir}/metrics.json", "w") as f:
        json.dump(metrics, f, sort_keys=True, indent=2)

    # stamp.json (Where timestamps are allowed)
    stamp = {
        "evidence_id": evidence_id,
        "git_sha": os.environ.get("GITHUB_SHA", "local-dev"),
        "run_type": "shadow-ingest"
    }
    with open(f"{output_dir}/stamp.json", "w") as f:
        json.dump(stamp, f, sort_keys=True, indent=2)

    print(f"Successfully ingested {len(all_records)} records.")

if __name__ == "__main__":
    main()
