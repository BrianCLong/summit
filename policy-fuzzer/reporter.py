"""Generates reports for the policy-fuzzer."""

import os

REPORTS_DIR = "reports"

def generate_reports(failing_cases, coverage_data):
    """Generates reports for the fuzzer."""
    print("Generating reports...")
    if not os.path.exists(REPORTS_DIR):
        os.makedirs(REPORTS_DIR)
    generate_corpus(failing_cases)
    generate_reproducers(failing_cases)
    generate_heatmap(coverage_data)

def generate_corpus(failing_cases):
    """Generates a corpus of failing cases."""
    with open(os.path.join(REPORTS_DIR, "failing_cases.txt"), "w") as f:
        for case in failing_cases:
            f.write(str(case) + "\n")

def generate_reproducers(failing_cases):
    """Generates minimal reproducers for each failing case."""
    for i, case in enumerate(failing_cases):
        with open(os.path.join(REPORTS_DIR, f"reproducer_{i}.py"), "w") as f:
            f.write("""Minimal reproducer.""" + "\n")
            f.write(f"policy = {case['policy']}\n")
            f.write(f"query = {case['query']}\n")

def generate_heatmap(coverage_data):
    """Generates a coverage heatmap."""
    with open(os.path.join(REPORTS_DIR, "coverage_heatmap.txt"), "w") as f:
        f.write("Coverage Heatmap:\n")
        for layer, rules in coverage_data.items():
            f.write(f"  Layer: {layer}\n")
            for rule, count in rules.items():
                f.write(f"    Rule '{rule}': {count} hits\n")
    print("Generating heatmap...")
