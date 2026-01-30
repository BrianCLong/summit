import os
import re
from typing import Any, Dict, List

from .rules import RULES


def check_file(filepath: str) -> list[dict[str, Any]]:
    violations = []
    try:
        with open(filepath, encoding='utf-8') as f:
            content = f.read()
            lines = content.splitlines()

            for rule in RULES:
                pattern = re.compile(rule["regex"])
                for i, line in enumerate(lines):
                    if pattern.search(line):
                        violations.append({
                            "rule_id": rule["id"],
                            "rule_name": rule["name"],
                            "message": rule["message"],
                            "file": filepath,
                            "line": i + 1,
                            "context": line.strip()
                        })
    except Exception as e:
        print(f"Error checking {filepath}: {e}")
    return violations

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Angular Modernity Evaluator")
    parser.add_argument("--fixtures", required=True, help="Directory or file to check")
    args = parser.parse_args()

    all_violations = []

    if os.path.isfile(args.fixtures):
        all_violations.extend(check_file(args.fixtures))
    else:
        for root, dirs, files in os.walk(args.fixtures):
            for file in files:
                if file.endswith(".ts") or file.endswith(".html"):
                    filepath = os.path.join(root, file)
                    all_violations.extend(check_file(filepath))

    if all_violations:
        print(f"Found {len(all_violations)} violations:")
        for v in all_violations:
            print(f"[{v['rule_id']}] {v['file']}:{v['line']} - {v['message']}")
            print(f"  Context: {v['context']}")
        # Exit with error code if violations found (strict mode)
        # But for 'main', maybe we just want to report.
        # Let's exit 1 if violations found to fail CI
        exit(1)
    else:
        print("No violations found.")

if __name__ == "__main__":
    main()
