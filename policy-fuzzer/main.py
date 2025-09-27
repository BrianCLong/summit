import re
import argparse
"""Main entry point for the policy-fuzzer."""

from policy_generator import generate_policy
from query_generator import generate_query
from governance_layers import check_consent, check_licenses, check_geo, check_retention, check_time_window, _resolve_field, COVERAGE
from reporter import generate_reports
from canaries import CANARIES
from attack_grammars import ATTACK_GRAMMARS
from datetime import datetime

def main():
    """Main function to run the policy fuzzer."""
    parser = argparse.ArgumentParser(description="Policy Red-Team Fuzzer (PRF)")
    parser.add_argument("--iterations", type=int, default=100, help="Number of fuzzing iterations")
    args = parser.parse_args()

    print("Running policy-fuzzer...")
    failing_cases = []

    # Test with canaries
    for canary in CANARIES:
        policy = canary["policy"]
        query = canary["query"]
        should_fail = canary["should_fail"]

        # Check against governance layers
        consent_result = check_consent(policy, query)
        licenses_result = check_licenses(policy, query)
        geo_result = check_geo(policy, query)
        retention_result = check_retention(policy, query)
        time_window_result = check_time_window(policy, query)

        is_compliant = all([consent_result, licenses_result, geo_result, retention_result, time_window_result])

        if is_compliant and should_fail:
            failing_cases.append({"policy": policy, "query": query, "reason": "Canary failed"})

    # Fuzzing loop
    for _ in range(args.iterations): # Use iterations from command-line argument
        policy = generate_policy()
        query = generate_query()

        # Determine if the policy-query pair *should* be compliant (the oracle)
        should_be_compliant = True

        # Oracle for consent
        policy_consent = policy.get("consent")
        query_data = _resolve_field(query, "data")
        if policy_consent == "user_data":
            if query_data != "user_data" and query_data not in ATTACK_GRAMMARS["synonym_dodges"].get("user_data", []):
                should_be_compliant = False

        # Oracle for geo
        policy_geo = policy.get("geo")
        query_location = _resolve_field(query, "location")
        if policy_geo == "US":
            if query_location != "US":
                should_be_compliant = False
        elif policy_geo == "EU":
            if query_location != "EU":
                should_be_compliant = False

        # Oracle for license
        policy_license = policy.get("license")
        query_license = _resolve_field(query, "license")
        if policy_license == "license_A":
            if query_license != "license_A" and query_license not in ATTACK_GRAMMARS["synonym_dodges"].get("license_A", []):
                should_be_compliant = False

        # Oracle for retention
        policy_retention = policy.get("retention")
        query_retention = _resolve_field(query, "retention")
        if policy_retention == "30d":
            if query_retention is not None and query_retention != "30d":
                # Check if it's a regex dodge
                regex_matched = False
                for regex in ATTACK_GRAMMARS["regex_dodges"].get("retention_period", []):
                    if re.match(regex, query_retention):
                        regex_matched = True
                        break
                if not regex_matched:
                    should_be_compliant = False

        # Oracle for time window
        policy_start_date_str = policy.get("start_date")
        policy_end_date_str = policy.get("end_date")
        query_access_date_str = _resolve_field(query, "access_date")

        if all([policy_start_date_str, policy_end_date_str, query_access_date_str]):
            policy_start_date = datetime.fromisoformat(policy_start_date_str)
            policy_end_date = datetime.fromisoformat(policy_end_date_str)
            query_access_date = datetime.fromisoformat(query_access_date_str)

            if not (policy_start_date <= query_access_date <= policy_end_date):
                should_be_compliant = False

        # Check against governance layers
        consent_result = check_consent(policy, query)
        licenses_result = check_licenses(policy, query)
        geo_result = check_geo(policy, query)
        retention_result = check_retention(policy, query)
        time_window_result = check_time_window(policy, query)

        is_compliant = all([consent_result, licenses_result, geo_result, retention_result, time_window_result])

        if not is_compliant and should_be_compliant:
            failing_cases.append({"policy": policy, "query": query, "reason": "Fuzzer found a failure"})


    if failing_cases:
        generate_reports(failing_cases, COVERAGE)
    else:
        print("No failing cases found.")

if __name__ == "__main__":
    main()
