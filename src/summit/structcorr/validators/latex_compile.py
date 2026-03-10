from typing import List, Dict

def validate_latex_sandbox(latex: str) -> List[Dict[str, str]]:
    findings = []

    if "\\write18" in latex or "\\immediate\\write18" in latex:
        findings.append({"rule": "latex.safe_mode", "severity": "fail"})
    else:
        findings.append({"rule": "latex.safe_mode", "severity": "info"})

    braces_diff = latex.count("{") - latex.count("}")
    if braces_diff != 0:
        findings.append({"rule": "latex.syntax_brace_balance", "severity": "fail"})
    else:
        findings.append({"rule": "latex.syntax_brace_balance", "severity": "info"})

    return findings
