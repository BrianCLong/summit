def validate_latex_sandbox(payload: str):
    findings = []
    if "write18" in payload:
        findings.append({"rule": "latex.safe_mode", "severity": "fail"})
    else:
        findings.append({"rule": "latex.safe_mode", "severity": "info"})

    if payload.count("{") == payload.count("}"):
        findings.append({"rule": "latex.syntax_brace_balance", "severity": "info"})
    else:
        findings.append({"rule": "latex.syntax_brace_balance", "severity": "fail"})

    return findings
