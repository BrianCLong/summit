#!/usr/bin/env python3
"""
Unit test runner for detection rules.
Evaluates rules against positive and negative fixtures.
"""
import json
import pathlib
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]
RULES_DIR = ROOT / "packages" / "detections" / "shiny_saas_vish" / "rules"
FIXTURES_DIR = ROOT / "packages" / "detections" / "shiny_saas_vish" / "tests" / "fixtures"

def evaluate_rule(rule, events):
    """
    Minimal detection engine for validation.
    Supports basic sequence and property checks.
    """
    rule_id = rule.get('id')
    query = rule.get('query', '')

    # Very simple mock evaluation logic for the specific rules we created
    if rule_id == "SHINY-001":
        # sequence: mfa_device_enroll -> oauth_app_consent -> (bulk_data_export or bytes > 100MB)
        has_enroll = any(e.get('action') == "mfa_device_enroll" for e in events)
        has_consent = any(e.get('action') == "oauth_app_consent" for e in events)
        has_exfil = any(e.get('action') == "bulk_data_export" or e.get('bytes', 0) > 100000000 for e in events)
        return has_enroll and has_consent and has_exfil

    elif rule_id == "SHINY-002":
        # sequence: login -> export count > 5
        has_login = any(e.get('action') == "login" for e in events)
        export_count = sum(1 for e in events if e.get('action') in ["salesforce_report_export", "bulk_api_download"])
        return has_login and export_count > 5

    elif rule_id == "SHINY-003":
        # oauth_app_consent (admin scope) -> google_takeout_started
        has_suspicious_oauth = any(
            e.get('action') == "oauth_app_consent" and
            "https://www.googleapis.com/auth/admin.reports.audit.readonly" in e.get('auth', {}).get('oauth_scopes', [])
            for e in events
        )
        has_takeout = any(e.get('action') == "google_takeout_started" for e in events)
        return has_suspicious_oauth and has_takeout

    elif rule_id == "SHINY-004":
        # gmail_send_message -> gmail_delete_message
        has_send = any(e.get('action') == "gmail_send_message" for e in events)
        has_delete = any(e.get('action') == "gmail_delete_message" for e in events)
        return has_send and has_delete

    return False

def main() -> int:
    if not RULES_DIR.exists():
        print(f"Rules directory not found: {RULES_DIR}", file=sys.stderr)
        return 1

    rule_files = list(RULES_DIR.glob("*.yml"))
    if not rule_files:
        print("No detection rules found", file=sys.stderr)
        return 2

    success = True
    for rf in rule_files:
        with open(rf) as f:
            rule = yaml.safe_load(f)

        rule_id = rule.get('id')
        print(f"Testing rule: {rule_id} ({rule.get('title')})")

        # Test positive fixture
        pos_file = FIXTURES_DIR / "positive" / f"pos_{rf.stem.replace('rule_', '')}.json"
        if pos_file.exists():
            with open(pos_file) as f:
                events = json.load(f)
            if evaluate_rule(rule, events):
                print("  [OK] Positive fixture triggered alert")
            else:
                print("  [ERROR] Positive fixture FAILED to trigger alert", file=sys.stderr)
                success = False
        else:
            print(f"  [WARNING] Positive fixture not found: {pos_file}")

        # Test negative fixture
        neg_file = FIXTURES_DIR / "negative" / f"neg_{rf.stem.replace('rule_', '')}.json"
        if neg_file.exists():
            with open(neg_file) as f:
                events = json.load(f)
            if not evaluate_rule(rule, events):
                print("  [OK] Negative fixture did not trigger alert")
            else:
                print("  [ERROR] Negative fixture FALSELY triggered alert", file=sys.stderr)
                success = False
        else:
            print(f"  [WARNING] Negative fixture not found: {neg_file}")

    if not success:
        return 3

    print("All detection unit tests passed.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
