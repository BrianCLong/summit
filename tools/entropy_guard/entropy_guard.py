#!/usr/bin/env python3
"""
Entropy Guard
Runs narrow, explicit rules to counter architecture drift.
"""
import os
import re
import sys

import yaml


def main() -> int:
    flag = os.getenv("SUMMIT_ENTROPY_GUARD", "on").lower()
    rules_path = os.getenv("SUMMIT_ENTROPY_RULES", "policies/entropy_guard/rules.v1.yaml")

    try:
        with open(rules_path, encoding="utf-8") as f:
            rules_config = yaml.safe_load(f) or {}
            rules = rules_config.get("rules", [])
    except FileNotFoundError:
        print(f"[entropy_guard] missing rules: {rules_path}")
        return 2

    findings = []

    # Simple file walker to simulate logic
    for root, dirs, files in os.walk("."):
        # Prune directories
        dirs[:] = [d for d in dirs if d not in [".git", "node_modules", ".pnpm-store"]]

        for file in files:
            if file.endswith((".py", ".js", ".ts", ".tsx", ".example")):
                path = os.path.join(root, file)
                try:
                    with open(path, encoding="utf-8") as f:
                        content = f.read()
                        for rule in rules:
                            regex = rule.get("match", {}).get("regex")
                            mode = rule.get("mode", "fail")
                            if regex and re.search(regex, content):
                                findings.append({
                                    "id": rule['id'],
                                    "path": path,
                                    "mode": mode,
                                    "msg": f"[{rule['id']}] {path}: {rule['description']}"
                                })
                except Exception:
                    continue

    fail_count = len([f for f in findings if f['mode'] == 'fail'])
    warn_count = len([f for f in findings if f['mode'] == 'warn'])

    if findings:
        for f in findings:
            print(f"[{f['mode'].upper()}] {f['msg']}")

    if fail_count > 0 and flag != "off":
        print(f"[entropy_guard] FAIL ({fail_count} errors, {warn_count} warnings)")
        return 1

    if findings:
         print(f"[entropy_guard] OK ({warn_count} warnings)")
    else:
         print("[entropy_guard] OK")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
