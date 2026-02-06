#!/usr/bin/env python3
import json
import os
import re


def count_lines(path):
    try:
        with open(path, encoding="utf-8") as f:
            return len(f.readlines())
    except Exception:
        return 0

def count_imports(path):
    count = 0
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                # Python imports
                if path.endswith(".py"):
                    if line.strip().startswith(("import ", "from ")):
                        count += 1
                # JS/TS imports
                elif path.endswith((".js", ".ts", ".tsx")):
                    if line.strip().startswith(("import ", "require(")):
                        count += 1
    except Exception:
        pass
    return count

def main() -> int:
    if os.getenv("SUMMIT_COMPLEXITY_BUDGET", "on").lower() == "off":
        print("[complexity_budget] disabled")
        return 0

    rules_path = "policies/complexity_budget/budgets.v1.json"
    try:
        with open(rules_path) as f:
            config = json.load(f)
            thresholds = config.get("thresholds", {})
    except FileNotFoundError:
        print(f"[complexity_budget] missing rules: {rules_path}")
        return 2

    max_lines = thresholds.get("max_file_lines", 800)
    max_imports = thresholds.get("max_imports", 60)

    violations = []
    stats = []

    # Walk the repo (simulating analysis on changed files, but here we scan a subset for demo)
    # To keep it fast and relevant, we look at tools/ and policies/ as examples
    target_dirs = ["tools", "policies", "evidence"]

    for target in target_dirs:
        if not os.path.exists(target):
            continue
        for root, dirs, files in os.walk(target):
            for file in files:
                if file.endswith((".py", ".js", ".ts", ".tsx")):
                    path = os.path.join(root, file)
                    lines = count_lines(path)
                    imports = count_imports(path)

                    stats.append({"path": path, "lines": lines, "imports": imports})

                    if lines > max_lines:
                        violations.append(f"File too long: {path} ({lines} > {max_lines})")
                    if imports > max_imports:
                        violations.append(f"Too many imports: {path} ({imports} > {max_imports})")

    evidence_id = "EVD-ARCHROT-CPLX-001"
    os.makedirs(f"evidence/{evidence_id}", exist_ok=True)

    report = {
        "evidence_id": evidence_id,
        "summary": f"Complexity analysis complete. {len(violations)} violations found in {len(stats)} files.",
        "artifacts": ["complexity_stats.json"]
    }

    with open(f"evidence/{evidence_id}/complexity_stats.json", "w", encoding="utf-8") as f:
        json.dump({"files": stats, "violations": violations}, f, indent=2, sort_keys=True)
    with open(f"evidence/{evidence_id}/report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, sort_keys=True)
    with open(f"evidence/{evidence_id}/metrics.json", "w", encoding="utf-8") as f:
        json.dump({"evidence_id": evidence_id, "metrics": {"violations_count": len(violations), "file_count": len(stats)}}, f, indent=2, sort_keys=True)
    with open(f"evidence/{evidence_id}/stamp.json", "w", encoding="utf-8") as f:
        json.dump({"evidence_id": evidence_id, "generated_at": "1970-01-01T00:00:00Z"}, f, indent=2, sort_keys=True)

    if violations:
        print(f"[complexity_budget] FAIL - {len(violations)} violations")
        for v in violations:
            print(v)
        return 1

    print(f"[complexity_budget] OK - Analyzed {len(stats)} files")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
