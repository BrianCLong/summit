from reporter import generate_reports
from canaries import CANARIES
from attack_grammars import ATTACK_GRAMMARS
from datetime import datetime
from metamorphic_tester import MetamorphicTester

def main():
    """Main function to run the policy fuzzer."""
    parser = argparse.ArgumentParser(description="Policy Red-Team Fuzzer (PRF)")
    parser.add_argument("--iterations", type=int, default=100, help="Number of fuzzing iterations")
    args = parser.parse_args()

    print("Running policy-fuzzer...")
    failing_cases = []
    oracle = PolicyOracle()
    metamorphic_tester = MetamorphicTester(oracle)

    # Test with canaries
    for canary in CANARIES:
        policy = canary["policy"]
        query = canary["query"]
        should_fail = canary["should_fail"]

        # Determine expected compliance using the new oracle
        should_be_compliant = oracle.determine_expected_compliance(policy, query)

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

        # Determine expected compliance using the new oracle
        should_be_compliant = oracle.determine_expected_compliance(policy, query)

        # Check against governance layers
        consent_result = check_consent(policy, query)
        licenses_result = check_licenses(policy, query)
        geo_result = check_geo(policy, query)
        retention_result = check_retention(policy, query)
        time_window_result = check_time_window(policy, query)

        is_compliant = all([consent_result, licenses_result, geo_result, retention_result, time_window_result])

        if not is_compliant and should_be_compliant:
            failing_cases.append({"policy": policy, "query": query, "reason": "Fuzzer found a failure"})

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
