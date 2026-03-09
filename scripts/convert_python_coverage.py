import sys
import json
import os

def convert(coverage_json_path, summary_json_path):
    print(f"Converting {coverage_json_path} to {summary_json_path}")
    if not os.path.exists(coverage_json_path):
        print(f"Error: {coverage_json_path} does not exist.")
        sys.exit(1)

    with open(coverage_json_path, 'r') as f:
        data = json.load(f)

    totals = data.get('totals', {})

    # Calculate percentages
    covered_lines = totals.get('covered_lines', 0)
    num_statements = totals.get('num_statements', 0)
    pct_lines = totals.get('percent_covered', 0)

    # Python coverage doesn't split lines vs statements in the same way Istanbul does, usually they are similar.
    # We map lines to lines and statements to statements.

    summary = {
        "total": {
            "lines": {
                "total": num_statements,
                "covered": covered_lines,
                "skipped": totals.get('skipped_lines', 0),
                "pct": pct_lines
            },
            "statements": {
                "total": num_statements,
                "covered": covered_lines,
                "skipped": totals.get('skipped_lines', 0),
                "pct": pct_lines
            },
            "functions": {
                 "total": 0, "covered": 0, "skipped": 0, "pct": 100
            },
            "branches": {
                 "total": totals.get('num_branches', 0),
                 "covered": totals.get('covered_branches', 0),
                 "skipped": totals.get('skipped_branches', 0),
                 "pct": totals.get('percent_covered_branches', 100) if totals.get('num_branches', 0) > 0 else 100
            }
        }
    }

    # Ensure directory exists
    dirname = os.path.dirname(summary_json_path)
    if dirname:
        os.makedirs(dirname, exist_ok=True)

    with open(summary_json_path, 'w') as f:
        json.dump(summary, f, indent=2)

    print("Conversion successful.")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_python_coverage.py <coverage.json> <coverage-summary.json>")
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
