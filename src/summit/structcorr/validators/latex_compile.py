from typing import Any, Dict, List
import re

def validate_latex_sandbox(data: str) -> List[Dict[str, str]]:
    findings = []
    if re.search(r'\\write18', data) or re.search(r'\\input\{.*?/.*\}', data):
        findings.append({"rule": "latex.safe_mode", "severity": "fail"})
    else:
        findings.append({"rule": "latex.safe_mode", "severity": "info"})

    if data.count('{') == data.count('}'):
        findings.append({"rule": "latex.syntax_brace_balance", "severity": "info"})
    else:
        findings.append({"rule": "latex.syntax_brace_balance", "severity": "fail"})

    return findings
