#!/usr/bin/env python3
"""
Entropy Guard (skeleton)
Runs narrow, explicit rules to counter architecture drift.
Feature-flag: SUMMIT_ENTROPY_GUARD=off disables hard failure.
"""
import os, sys, re, yaml

def main() -> int:
    flag = os.getenv("SUMMIT_ENTROPY_GUARD", "on").lower()
    # Try to find rules file
    rules_path = os.getenv("SUMMIT_ENTROPY_RULES", "policies/entropy_guard/rules.v1.yaml")

    if not os.path.exists(rules_path):
        # Fallback to repo root relative path
        script_dir = os.path.dirname(os.path.abspath(__file__))
        repo_root = os.path.abspath(os.path.join(script_dir, "../../"))
        possible_path = os.path.join(repo_root, "policies/entropy_guard/rules.v1.yaml")
        if os.path.exists(possible_path):
            rules_path = possible_path

    try:
        with open(rules_path, "r", encoding="utf-8") as f:
            rules_config = yaml.safe_load(f) or {}
    except FileNotFoundError:
        print(f"[entropy_guard] missing rules: {rules_path}")
        return 2

    rules = rules_config.get("rules", [])
    findings = []

    # Walk current directory or provided argument
    if len(sys.argv) > 1:
        target_dir = sys.argv[1]
    else:
        target_dir = os.getcwd()

    # Iterate files (excluding .git, node_modules etc)
    for root, dirs, files in os.walk(target_dir):
        # Filter dirs
        dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "venv", "__pycache__", "target", "dist", "build"}]

        for file in files:
            filepath = os.path.join(root, file)
            # Skip this script and tests/fixtures/bad from self-flagging if running from root
            if "bad_global_listener.example" in filepath:
                # We want to detect this for the TEST, but generally we might filter tests?
                # For now, let's allow it so the test passes.
                pass

            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                for rule in rules:
                    match_config = rule.get("match", {})
                    regex = match_config.get("regex")
                    if regex:
                        if re.search(regex, content):
                            findings.append({
                                "msg": f"Rule {rule['id']} violation in {filepath}: {rule['description']}",
                                "mode": rule.get("mode", "fail")
                            })
            except Exception:
                pass

    fail_count = 0
    if findings:
        print("[entropy_guard] Findings:")
        for f in findings:
            prefix = "[WARN]" if f["mode"] == "warn" else "[FAIL]"
            print(f"{prefix} {f['msg']}")
            if f["mode"] != "warn":
                fail_count += 1

    if fail_count > 0:
        if flag == "off":
            print(f"[entropy_guard] FAIL suppressed (SUMMIT_ENTROPY_GUARD=off). Found {fail_count} blocking violations.")
            return 0
        else:
            print(f"[entropy_guard] FAILED with {fail_count} blocking violations.")
            return 1

    print("[entropy_guard] OK")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
