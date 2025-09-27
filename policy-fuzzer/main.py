from policy_generator import generate_policy
from query_generator import generate_query
from governance_layers import check_consent, check_licenses, check_geo, check_retention, check_time_window, _resolve_field, COVERAGE
from reporter import generate_reports
from canaries import CANARIES
from attack_grammars import ATTACK_GRAMMARS
from datetime import datetime
from metamorphic_tester import MetamorphicTester
from policy_oracle import PolicyOracle

def main():
    """Main function to run the policy fuzzer."""
    parser = argparse.ArgumentParser(description="Policy Red-Team Fuzzer (PRF)")
    parser.add_argument("--iterations", type=int, default=100, help="Number of fuzzing iterations")
    parser.add_argument("--enable-synonym-dodges", action="store_true", help="Enable synonym dodge attack grammar")
    parser.add_argument("--enable-regex-dodges", action="store_true", help="Enable regex dodge attack grammar")
    parser.add_argument("--enable-time-window-hops", action="store_true", help="Enable time window boundary hops attack grammar")
    parser.add_argument("--enable-field-aliasing", action="store_true", help="Enable field aliasing attack grammar")
    parser.add_argument("--enable-data-type-mismatches", action="store_true", help="Enable data type mismatches attack grammar")
    args = parser.parse_args()

    print("Running policy-fuzzer...")
    failing_cases = []

    # Test with canaries
    for canary in CANARIES:
        policy = canary["policy"]
        query = canary["query"]
        should_fail = canary["should_fail"]

        # Instantiate oracle for each canary to ensure it uses the specific policy definition
        oracle = PolicyOracle(policy) # Pass the policy directly to the oracle
        metamorphic_tester = MetamorphicTester(oracle)

        # Determine expected compliance using the new oracle
        should_be_compliant = oracle.determine_expected_compliance(policy, query)

        # Check against governance layers
        consent_result, consent_reason = check_consent(policy, query)
        licenses_result, licenses_reason = check_licenses(policy, query)
        geo_result, geo_reason = check_geo(policy, query)
        retention_result, retention_reason = check_retention(policy, query)
        time_window_result, time_window_reason = check_time_window(policy, query)

        is_compliant = all([consent_result, licenses_result, geo_result, retention_result, time_window_result])

        if is_compliant and should_fail:
            failing_cases.append({"policy": policy, "query": query, "reason": "Canary failed"})

    # Fuzzing loop
    for _ in range(args.iterations): # Use iterations from command-line argument
        policy = generate_policy()
        query = generate_query(args) # Pass args to generate_query

        # Instantiate oracle for each fuzzed policy
        oracle = PolicyOracle(policy) # Pass the generated policy to the oracle
        metamorphic_tester = MetamorphicTester(oracle)

        # Determine expected compliance using the new oracle
        should_be_compliant = oracle.determine_expected_compliance(policy, query)

        # Check against governance layers
        consent_result, consent_reason = check_consent(policy, query)
        licenses_result, licenses_reason = check_licenses(policy, query)
        geo_result, geo_reason = check_geo(policy, query)
        retention_result, retention_reason = check_retention(policy, query)
        time_window_result, time_window_reason = check_time_window(policy, query)

        is_compliant = all([consent_result, licenses_result, geo_result, retention_result, time_window_result])

        if not is_compliant and should_be_compliant:
            reasons = ", ".join(filter(None, [consent_reason, licenses_reason, geo_reason, retention_reason, time_window_reason]))
            failing_cases.append({"policy": policy, "query": query, "reason": f"Fuzzer found a failure: {reasons}"})

        # Metamorphic testing
        metamorphic_violations = metamorphic_tester.test_relations(policy, query, should_be_compliant)
        for violation in metamorphic_violations:
            failing_cases.append({"policy": violation["original_policy"],
                                  "query": violation["original_query"],
                                  "reason": f"Metamorphic violation: {violation["relation_name"]}",
                                  "transformed_query": violation["transformed_query"],
                                  "original_compliant": violation["original_compliant"],
                                  "transformed_compliant": violation["transformed_compliant"]})

    if failing_cases:
        generate_reports(failing_cases, COVERAGE)
    else:
        print("No failing cases found.")
