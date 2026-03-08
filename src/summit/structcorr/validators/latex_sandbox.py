from typing import Any, Dict, List
import re

def compile_latex_sandbox(data: str) -> List[Dict[str, str]]:
    findings = []
    if re.search(r'\\write18', data) or re.search(r'\\input\{.*?/.*\}', data):
        findings.append({"rule": "latex.no_shell_escape", "severity": "fail"})
    else:
        findings.append({"rule": "latex.no_shell_escape", "severity": "info"})
    return findings
