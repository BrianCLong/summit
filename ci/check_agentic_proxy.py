#!/usr/bin/env python3
import argparse
import json
import os
import sys
from dataclasses import asdict
from pathlib import Path

# Add root to python path to import detectors
sys.path.append(str(Path(__file__).resolve().parents[1]))

from detectors.human_outsourcing_detector import HumanOutsourcingDetector


def scan_file(detector: HumanOutsourcingDetector, filepath: Path) -> list[dict]:
    violations = []
    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
        result = detector.detect(content)
        if result.detected:
            violations.append({
                "file": str(filepath),
                "reason": result.reason,
                "confidence": result.confidence,
                "evidence_id": result.evidence_id
            })
    except Exception as e:
        print(f"Error scanning {filepath}: {e}", file=sys.stderr)
    return violations

def main():
    parser = argparse.ArgumentParser(description="Scan for AI-Human outsourcing risks")
    parser.add_argument("--target", help="Target directory to scan", default=".")
    parser.add_argument("--fail-on-high", action="store_true", help="Fail build if high severity detected")
    parser.add_argument("--report", help="Output report file", default="report.json")
    args = parser.parse_args()

    detector = HumanOutsourcingDetector()
    all_violations = []

    target_path = Path(args.target)

    # Files to exclude
    exclude_dirs = {".git", "__pycache__", "node_modules", "venv", ".venv"}
    exclude_files = {"package-lock.json", "pnpm-lock.yaml", "report.json", "ai_rents_human.json"}

    if target_path.is_file():
        all_violations.extend(scan_file(detector, target_path))
    else:
        for root, dirs, files in os.walk(target_path):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]

            for file in files:
                if file in exclude_files:
                    continue
                if file.endswith((".py", ".ts", ".js", ".md", ".json", ".yaml", ".txt")):
                     filepath = Path(root) / file
                     # Skip the detector itself and tests to avoid false positives on the patterns
                     if "human_outsourcing_detector.py" in str(filepath) or "test_human_outsourcing_detector.py" in str(filepath):
                         continue
                     if "ai_rents_human.json" in str(filepath): # Skip fixture
                         continue
                     all_violations.extend(scan_file(detector, filepath))

    # Generate report
    report = {
        "scan_target": str(target_path),
        "violations_count": len(all_violations),
        "violations": all_violations
    }

    with open(args.report, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Report generated at {args.report}")

    if all_violations:
        print("Human Outsourcing Risks Detected:")
        for v in all_violations:
            print(f" - {v['file']}: {v['reason']} ({v['evidence_id']})")

        if args.fail_on_high:
            print("Failing build due to high severity risks.")
            sys.exit(1)
    else:
        print("No outsourcing risks detected.")
        sys.exit(0)

if __name__ == "__main__":
    main()
