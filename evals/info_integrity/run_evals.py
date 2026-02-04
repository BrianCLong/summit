import json
import sys
from pathlib import Path

from modules.info_integrity.reporting import write_compliance_evidence
from modules.info_integrity.validate import (
    validate_payload_no_prohibited_fields,
    validate_request_intent,
)

ROOT = Path(__file__).resolve().parents[2]
FIXTURES_DIR = ROOT / "evals" / "info_integrity" / "fixtures"
EVIDENCE_DIR = ROOT / "evidence" / "runs" / "ai-miso-psyop-2025"

def run_eval_on_file(filepath: Path):
    intent_blocks = 0
    field_blocks = 0
    passed = 0
    total = 0

    with open(filepath) as f:
        for line in f:
            if not line.strip():
                continue
            total += 1
            data = json.loads(line)
            intent = data.get("intent")
            payload = data.get("payload", {})

            try:
                validate_request_intent(intent)
                validate_payload_no_prohibited_fields(payload)
                passed += 1
            except ValueError as e:
                if "Prohibited intent" in str(e):
                    intent_blocks += 1
                elif "Prohibited fields" in str(e):
                    field_blocks += 1

    return {
        "total": total,
        "passed": passed,
        "prohibited_intent_blocks": intent_blocks,
        "prohibited_field_blocks": field_blocks
    }

def main():
    findings = {
        "positive": run_eval_on_file(FIXTURES_DIR / "positive.jsonl"),
        "negative": run_eval_on_file(FIXTURES_DIR / "negative.jsonl")
    }

    combined_metrics = {
        "prohibited_intent_blocks": findings["positive"]["prohibited_intent_blocks"] + findings["negative"]["prohibited_intent_blocks"],
        "prohibited_field_blocks": findings["positive"]["prohibited_field_blocks"] + findings["negative"]["prohibited_field_blocks"]
    }

    evidence = write_compliance_evidence(
        EVIDENCE_DIR,
        "EVD-AI-MISO-PSYOP-2025-EVAL-001",
        combined_metrics
    )

    print(f"Eval complete. Findings: {findings}")
    print(f"Evidence written to: {EVIDENCE_DIR}")

    # Success criteria: positive must pass all, negative must block all
    if findings["positive"]["passed"] != findings["positive"]["total"]:
        print("FAIL: Positive fixtures failed validation")
        sys.exit(1)
    if findings["negative"]["passed"] != 0:
        print("FAIL: Negative fixtures passed validation")
        sys.exit(1)

    print("SUCCESS: All evals passed compliance gates")

if __name__ == "__main__":
    main()
