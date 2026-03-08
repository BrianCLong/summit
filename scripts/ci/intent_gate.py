#!/usr/bin/env python3
import json
import logging
import os
import sys
from typing import Any, Dict

# Ensure summit path is accessible
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from summit.intent.report import ReportGenerator
from summit.intent.validator import IntentValidator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main(spec_path: str, execution_context_path: str):
    logger.info(f"Validating intent spec at: {spec_path}")

    with open(spec_path) as f:
        spec_data = json.load(f)

    with open(execution_context_path) as f:
        exec_ctx = json.load(f)

    validator = IntentValidator(schema_path="schemas/intent_spec.schema.json")

    # Check basic spec syntax validation
    validation_result = validator.validate_spec(spec_data)
    if not validation_result["is_valid"]:
        logger.error(f"Spec validation failed: {validation_result['errors']}")
        sys.exit(1)

    # Evaluate execution constraints
    evaluation = validator.evaluate_constraints(spec_data, exec_ctx)

    # Generate Output Reports
    report_gen = ReportGenerator(output_dir="artifacts/intent")

    # Generate artifacts
    report = report_gen.generate_report(spec_data, evaluation)
    metrics = report_gen.generate_metrics(exec_ctx)
    stamp = report_gen.generate_stamp(spec_data, evaluation)

    # Output artifact directory
    os.makedirs("artifacts/intent", exist_ok=True)
    with open("artifacts/intent/report.json", "w") as f:
        json.dump(report, f, indent=2)
    with open("artifacts/intent/metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    with open("artifacts/intent/stamp.json", "w") as f:
        json.dump(stamp, f, indent=2)

    logger.info("Wrote artifacts to artifacts/intent/ directory.")

    # Apply fail condition based on validation
    if not evaluation["passed"]:
        logger.error(f"Constraint violations occurred: {evaluation['violations']}")
        sys.exit(1)

    logger.info("Intent CI Gate Passed Deterministically.")
    sys.exit(0)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        logger.error("Usage: intent_gate.py <intent_spec.json> <execution_context.json>")
        sys.exit(1)

    main(sys.argv[1], sys.argv[2])
