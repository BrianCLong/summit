import hashlib
import json
import os
from typing import Dict, List

from . import git, rules
from .schema import Metrics, Report, Stamp

ARTIFACTS_DIR = "artifacts/solid-gate"

def ensure_artifacts_dir():
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

def generate_config_hash() -> str:
    # Deterministic hash of rules logic (simplification: just version/salt)
    return hashlib.sha256(b"solid-gate-v1").hexdigest()[:12]

def run(diff_base: str = "origin/main", enforce: bool = False):
    ensure_artifacts_dir()

    print(f"Running Solid Gate against base: {diff_base}")
    changed_files = git.get_changed_files(diff_base)
    print(f"Changed files: {len(changed_files)}")

    findings = rules.check_rules(changed_files, git.get_file_content)

    report = Report(findings=findings)
    metrics = Metrics.from_report(report)
    stamp = Stamp(
        tool_version="1.0.0",
        config_hash=generate_config_hash(),
        commit_sha=git.get_current_commit_sha(),
        diff_base=diff_base
    )

    # Write artifacts
    with open(os.path.join(ARTIFACTS_DIR, "report.json"), "w") as f:
        json.dump(report.to_dict(), f, indent=2)

    with open(os.path.join(ARTIFACTS_DIR, "metrics.json"), "w") as f:
        json.dump(metrics.to_dict(), f, indent=2)

    with open(os.path.join(ARTIFACTS_DIR, "stamp.json"), "w") as f:
        json.dump(stamp.to_dict(), f, indent=2)

    print("Artifacts generated in artifacts/solid-gate/")

    # Summary
    if findings:
        print(f"Found {len(findings)} issues.")
        for f in findings:
            print(f"[{f.severity.upper()}] {f.rule_id}: {f.message} ({f.path}:{f.line})")
    else:
        print("No issues found.")

    if enforce:
        # If enforcement is on, we exit non-zero on 'fail' severity
        # For MWS, we don't strict enforce yet, but the logic is here.
        if any(f.severity == 'fail' for f in findings):
            return 1

    return 0
