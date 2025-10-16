"""Generates reports for the policy-fuzzer."""

import os

REPORTS_DIR = "policy-fuzzer/reports"


def assess_impact_and_severity(failing_case):
    """Assesses the impact and severity of a failing case based on its reason."""
    reason = failing_case.get("reason", "")
    severity = "Low"
    impact = "Minor Bug"

    if "Synonym dodge detected" in reason or "Regex dodge detected" in reason:
        severity = "Medium"
        impact = "Policy Bypass (Obfuscation)"
    elif "mismatched data type" in reason or "invalid date format" in reason:
        severity = "Medium"
        impact = "Data Type Coercion Vulnerability"
    elif "Metamorphic violation" in reason:
        severity = "High"
        impact = "Metamorphic Relation Violation"
    elif "outside policy window" in reason:
        severity = "High"
        impact = "Time Window Policy Bypass"
    elif (
        "Consent policy requires" in reason
        or "License policy requires" in reason
        or "Geo policy requires" in reason
    ):
        severity = "Critical"
        impact = "Direct Policy Violation"

    return severity, impact


def generate_html_report(failing_cases, coverage_data):
    """Generates an HTML report of failing cases and coverage data."""
    os.makedirs(REPORTS_DIR, exist_ok=True)
    report_path = os.path.join(REPORTS_DIR, "report.html")

    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Policy Fuzzer Report</title>
        <style>
            body { font-family: sans-serif; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .heatmap-cell { width: 50px; height: 20px; text-align: center; vertical-align: middle; }
            .color-0 { background-color: #ffebee; } /* Lightest red */
            .color-1 { background-color: #ffcdd2; }
            .color-2 { background-color: #ef9a9a; }
            .color-3 { background-color: #e57373; }
            .color-4 { background-color: #ef5350; }
            .color-5 { background-color: #f44336; }
            .color-6 { background-color: #e53935; }
            .color-7 { background-color: #d32f2f; }
            .color-8 { background-color: #c62828; }
            .color-9 { background-color: #b71c1c; } /* Darkest red */
        </style>
    </head>
    <body>
        <h1>Policy Fuzzer Report</h1>

        <h2>Failing Cases</h2>
        {failing_cases_table}

        <h2>Coverage Heatmap</h2>
        {coverage_heatmap_table}

    </body>
    </html>
    """

    # Sort failing cases by severity (Critical > High > Medium > Low)
    severity_order = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}
    sorted_failing_cases = sorted(
        failing_cases, key=lambda x: severity_order.get(x.get("severity", "Low"), 0), reverse=True
    )

    # Generate failing cases table
    failing_cases_table = ""
    if sorted_failing_cases:
        failing_cases_table = "<table><tr><th>Severity</th><th>Impact</th><th>Policy</th><th>Query</th><th>Reason</th><th>Reproducer</th></tr>"
        for i, case in enumerate(sorted_failing_cases):
            reproducer_link = f'<a href="reproducer_{i}.py">reproducer_{i}.py</a>'
            failing_cases_table += f"<tr><td>{case.get('severity', 'N/A')}</td><td>{case.get('impact', 'N/A')}</td><td><pre>{case['policy']}</pre></td><td><pre>{case['query']}</pre></td><td>{case['reason']}</td><td>{reproducer_link}</td></tr>"
        failing_cases_table += "</table>"
    else:
        failing_cases_table = "<p>No failing cases found.</p>"

    # Generate coverage heatmap table
    coverage_heatmap_table = "<table><tr><th>Layer/Metric</th><th>Count</th></tr>"
    for layer, metrics in coverage_data.items():
        for metric, count in metrics.items():
            color_class = f"color-{min(count // 10, 9)}"  # Scale count to 0-9 for coloring
            coverage_heatmap_table += f'<tr><td>{layer}.{metric}</td><td class="heatmap-cell {color_class}">{count}</td></tr>'
    coverage_heatmap_table += "</table>"

    with open(report_path, "w") as f:
        f.write(
            html_content.format(
                failing_cases_table=failing_cases_table,
                coverage_heatmap_table=coverage_heatmap_table,
            )
        )
    print(f"HTML report generated at: {report_path}")


def generate_reports(failing_cases, coverage_data):
    """Generates various reports based on fuzzing results."""
    os.makedirs(REPORTS_DIR, exist_ok=True)

    # Assess impact and severity for each failing case
    for case in failing_cases:
        severity, impact = assess_impact_and_severity(case)
        case["severity"] = severity
        case["impact"] = impact

    # Generate failing cases text report
    if failing_cases:
        with open(os.path.join(REPORTS_DIR, "failing_cases.txt"), "w") as f:
            for i, case in enumerate(failing_cases):
                f.write(f"Failing Case {i+1}:\n")
                f.write(f"  Severity: {case.get('severity', 'N/A')}\n")
                f.write(f"  Impact: {case.get('impact', 'N/A')}\n")
                f.write(f"  Policy: {case['policy']}\n")
                f.write(f"  Query: {case['query']}\n")
                f.write(f"  Reason: {case['reason']}\n")
                if "transformed_query" in case:
                    f.write(f"  Transformed Query: {case['transformed_query']}\n")
                    f.write(f"  Original Compliant: {case['original_compliant']}\n")
                    f.write(f"  Transformed Compliant: {case['transformed_compliant']}\n")
                f.write("\n")

        # Generate reproducer files
        for i, case in enumerate(failing_cases):
            with open(os.path.join(REPORTS_DIR, f"reproducer_{i}.py"), "w") as f:
                f.write(f"# Reproducer for failing case {i+1}\n")
                f.write("from datetime import datetime\n")
                f.write(
                    "from governance_layers import check_consent, check_licenses, check_geo, check_retention, check_time_window\n"
                )
                f.write(f"policy = {case['policy']}\n")
                f.write(f"query = {case['query']}\n")
                f.write("\n")
                f.write("consent_result, _ = check_consent(policy, query)\n")
                f.write("licenses_result, _ = check_licenses(policy, query)\n")
                f.write("geo_result, _ = check_geo(policy, query)\n")
                f.write("retention_result, _ = check_retention(policy, query)\n")
                f.write("time_window_result, _ = check_time_window(policy, query)\n")
                f.write("\n")
                f.write(
                    "is_compliant = all([consent_result, licenses_result, geo_result, retention_result, time_window_result])\n"
                )
                f.write(f'print(f"Policy: {policy}")\n')
                f.write(f'print(f"Query: {query}")\n')
                f.write(f'print(f"Is Compliant: {is_compliant}")\n')
                f.write(
                    f"# Expected: {'Non-compliant' if 'Metamorphic' in case['reason'] else 'Compliant'}\n"
                )

    # Generate coverage heatmap text report (existing functionality)
    with open(os.path.join(REPORTS_DIR, "coverage_heatmap.txt"), "w") as f:
        f.write("Coverage Heatmap:\n")
        for layer, metrics in coverage_data.items():
            f.write(f"  {layer}:\n")
            for metric, count in metrics.items():
                f.write(f"    {metric}: {count}\n")

    # Generate HTML report
    generate_html_report(failing_cases, coverage_data)
