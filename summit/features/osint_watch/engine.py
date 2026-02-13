import os
import re
import json
import hashlib
import sys
from typing import Dict, Any

# Adjust paths relative to repo root
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
# Output to artifacts/osint_watch/evidence
ARTIFACTS_DIR = os.path.join(REPO_ROOT, "artifacts/osint_watch/evidence")
INPUT_FILE = os.path.join(REPO_ROOT, "briefs/2026-02-04-osint-methodology.md")

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def parse_markdown(content: str) -> Dict[str, Any]:
    sections = {}
    current_section = None
    lines = content.split('\n')

    for line in lines:
        if line.startswith('## '):
            current_section = line.strip('# ').strip()
            # Remove emoji if present
            current_section = re.sub(r'[^\w\s\(\)\-\&]+', '', current_section).strip()
            sections[current_section] = []
        elif current_section:
            if line.strip() and not line.strip() == '---':
                sections[current_section].append(line.strip())

    report_sections = {}
    for sec, lines in sections.items():
        text = "\n".join(lines)
        report_sections[sec] = text

    return {"sections": report_sections}

def generate_stamp(content: str) -> Dict[str, str]:
    hasher = hashlib.sha256()
    hasher.update(content.encode('utf-8'))
    digest = hasher.hexdigest()
    return {"hash": digest, "algorithm": "sha256"}

def save_json(data: Any, filepath: str):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, sort_keys=True, separators=(',', ':'), ensure_ascii=False)

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Input file not found: {INPUT_FILE}")
        sys.exit(1)

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    report_content = parse_markdown(content)

    report_data = {
        "evidence_id": "EVD-OSINT-WATCH-2026-02-04",
        **report_content
    }

    stamp_data = generate_stamp(content)
    stamp_data["evidence_id"] = "EVD-OSINT-WATCH-STAMP-2026-02-04"

    delta_data = {"status": "initial_ingestion", "diff": None}

    metrics_data = {
        "processed_sections": len(report_data.get("sections", {})),
        "source_file": INPUT_FILE,
        "evidence_id": "EVD-OSINT-WATCH-METRICS-2026-02-04"
    }

    ensure_dir(ARTIFACTS_DIR)

    save_json(report_data, os.path.join(ARTIFACTS_DIR, "report.json"))
    save_json(stamp_data, os.path.join(ARTIFACTS_DIR, "stamp.json"))
    save_json(delta_data, os.path.join(ARTIFACTS_DIR, "delta.json"))
    save_json(metrics_data, os.path.join(ARTIFACTS_DIR, "metrics.json"))

    # Generate index.json
    # Paths in index.json are relative to the bundle root? Or evidence dir?
    # tools/ci/evidence_validate_bundle.py:
    #   full_path = bundle / path_str
    # So if bundle is artifacts/osint_watch, and path_str is "evidence/report.json", it works.
    # But now I'm outputting everything to artifacts/osint_watch/evidence.
    # If I run validate on artifacts/osint_watch, it finds evidence/index.json.
    # Inside index.json, paths should be "evidence/report.json".

    index_data = {
        "bundle_id": "osint-watch-2026-02-04",
        "evidence": [
            {
                "description": "OSINT Methodology Report",
                "evidence_id": "EVD-OSINT-WATCH-2026-02-04",
                "path": "evidence/report.json",
                "schema_path": "osint_watch.report.schema.json"
            },
             {
                "description": "OSINT Watch Metrics",
                "evidence_id": "EVD-OSINT-WATCH-METRICS-2026-02-04",
                "path": "evidence/metrics.json",
                "schema_path": "evidence.metrics.schema.json"
            },
            {
                "description": "Evidence stamp",
                "evidence_id": "EVD-OSINT-WATCH-STAMP-2026-02-04",
                "path": "evidence/stamp.json",
                "schema_path": "evidence.stamp.schema.json"
            }
        ]
    }
    save_json(index_data, os.path.join(ARTIFACTS_DIR, "index.json"))

    print(f"Artifacts generated in {ARTIFACTS_DIR}")

if __name__ == "__main__":
    main()
