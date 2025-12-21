#!/usr/bin/env python3
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import requests
import yaml

SCENARIO_DIR = Path(__file__).parent / "scenarios"
RUN_DIR = Path(__file__).parent / "runs" / datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
RUN_DIR.mkdir(parents=True, exist_ok=True)

def load_scenarios():
    scenarios = []
    for file in SCENARIO_DIR.glob("*.yaml"):
        with open(file, "r", encoding="utf-8") as handle:
            scenarios.append(yaml.safe_load(handle))
    return scenarios

def run_step(base, step):
    url = f"{base}{step['path']}"
    method = step.get("method", "GET").lower()
    headers = step.get("headers", {})
    body = step.get("body", None)
    response = requests.request(method, url, headers=headers, json=body, timeout=10)
    evidence = {
        "url": url,
        "status": response.status_code,
        "body": response.text[:500],
        "headers": dict(response.headers),
    }
    expected_status = step.get("expect_status")
    expected_body = step.get("expect_body_includes")
    passed = True
    reasons = []
    if expected_status and response.status_code != expected_status:
        passed = False
        reasons.append(f"status {response.status_code} != {expected_status}")
    if expected_body and expected_body not in response.text:
        passed = False
        reasons.append("expected body string missing")
    return passed, reasons, evidence

def run_scenario(scenario):
    scenario_dir = RUN_DIR / scenario["name"]
    scenario_dir.mkdir(parents=True, exist_ok=True)
    results = []
    base = scenario.get("host")
    for step in scenario.get("steps", []):
        passed, reasons, evidence = run_step(base, step)
        results.append({"step": step["description"], "passed": passed, "reasons": reasons, "evidence": evidence})
        time.sleep(1 / max(1, scenario.get("rate_limit_rps", 1)))
    with open(scenario_dir / "results.json", "w", encoding="utf-8") as handle:
        json.dump(results, handle, indent=2)
    failed = [r for r in results if not r["passed"]]
    return len(failed) == 0

def main():
    scenarios = load_scenarios()
    summary = []
    for scenario in scenarios:
        passed = run_scenario(scenario)
        summary.append({"scenario": scenario["name"], "passed": passed})
    junit_lines = ["<testsuite name=\"redteam\" tests=\"{}\">".format(len(summary))]
    for item in summary:
        if item["passed"]:
            junit_lines.append(f"  <testcase name=\"{item['scenario']}\" />")
        else:
            junit_lines.append(f"  <testcase name=\"{item['scenario']}\"><failure message=\"failed\" /></testcase>")
    junit_lines.append("</testsuite>")
    junit = "\n".join(junit_lines)
    with open(RUN_DIR / "junit.xml", "w", encoding="utf-8") as handle:
        handle.write(junit)
    print(json.dumps(summary, indent=2))
    if any(not item["passed"] for item in summary):
        sys.exit(1)

if __name__ == "__main__":
    main()
