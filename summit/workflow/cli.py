import sys
import argparse
import uuid
from summit.workflow.base import WorkflowValidator

def main():
    parser = argparse.ArgumentParser(description="Summit Workflow CLI")
    subparsers = parser.add_subparsers(dest="command")

    validate_parser = subparsers.add_parser("validate", help="Validate a workflow project")
    validate_parser.add_argument("path", help="Path to the dbt project or Airflow DAG")
    validate_parser.add_argument("--output", help="Output directory for evidence", default="artifacts/workflow")
    validate_parser.add_argument("--run-id", help="Manually specify run ID for determinism")

    args = parser.parse_args()

    if args.command == "validate":
        validator = WorkflowValidator(output_dir=args.output)
        results = validator.validate(args.path)

        run_id = args.run_id or str(uuid.uuid4())
        evidence_id = validator.generate_evidence(results, run_id)

        print(f"Validation {results['status']}")
        print(f"Evidence ID: {evidence_id}")
        print(f"Artifacts: {args.output}")

        if results["status"] != "validated":
            sys.exit(1)
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
