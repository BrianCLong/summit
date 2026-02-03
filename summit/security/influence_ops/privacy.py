from typing import Any, Dict, List

NEVER_LOG_FIELDS = [
    "raw_profile",
    "psychographic_segment",
    "user_fingerprint",
    "contact_list",
    "ad_targeting_params",
    "political_affiliation",
    "voting_history"
]

class InfluencePrivacyGuard:
    def validate_log_entry(self, entry: Any) -> list[str]:
        violations = []
        if isinstance(entry, dict):
            for k, v in entry.items():
                if k in NEVER_LOG_FIELDS:
                    violations.append(k)
                violations.extend(self.validate_log_entry(v))
        elif isinstance(entry, list):
            for item in entry:
                violations.extend(self.validate_log_entry(item))
        return violations

    def audit(self, logs: list[dict[str, Any]]) -> dict[str, Any]:
        total_violations = 0
        violated_fields = set()
        for log in logs:
            v = self.validate_log_entry(log)
            if v:
                total_violations += 1
                violated_fields.update(v)

        return {
            "neverlog_violations": total_violations,
            "violated_fields": list(violated_fields)
        }

if __name__ == "__main__":
    import argparse
    import json
    import sys

    parser = argparse.ArgumentParser()
    parser.add_argument("--audit", action="store_true", help="Run audit")
    args = parser.parse_args()

    # Self-test / Demo
    guard = InfluencePrivacyGuard()
    logs = [
        {"user_id": "123", "action": "login"},
        {"user_id": "123", "raw_profile": "psychographics data", "action": "generate"},
        {"user_id": "456", "ad_targeting_params": {"age": "25-34"}, "action": "ad"}
    ]
    res = guard.audit(logs)
    print(json.dumps(res, indent=2))
