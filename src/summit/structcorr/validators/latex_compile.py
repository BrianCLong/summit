def validate_latex_sandbox(data: str) -> list:
    findings = []
    if "write18" in data:
        findings.append({"rule": "latex.safe_mode", "severity": "fail"})
    else:
        findings.append({"rule": "latex.safe_mode", "severity": "info"})

    braces_balance = data.count('{') == data.count('}')
    findings.append({
        "rule": "latex.syntax_brace_balance",
        "severity": "info" if braces_balance else "fail"
    })
    return findings
