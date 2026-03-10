import json
from typing import Any, Dict, List

def validate_json_contract(data: str, contract: Dict[str, Any] = None) -> List[Dict[str, str]]:
    findings = []
    try:
        parsed = json.loads(data)
        findings.append({"rule": "json.parseable", "severity": "info"})
        if contract and "required_keys" in contract:
            missing = [k for k in contract["required_keys"] if k not in parsed]
            if missing:
                findings.append({"rule": "json.required_keys", "severity": "fail"})
            else:
                findings.append({"rule": "json.required_keys", "severity": "info"})
    except json.JSONDecodeError:
        findings.append({"rule": "json.parseable", "severity": "fail"})
    return findings
