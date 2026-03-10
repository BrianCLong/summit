import json
from typing import Dict, Any, List

def validate_json_contract(payload: str, schema: Dict[str, Any] = None) -> List[Dict[str, str]]:
    findings = []
    try:
        data = json.loads(payload)
        findings.append({"rule": "json.parseable", "severity": "info"})

        if schema and "required_keys" in schema:
            missing_keys = [key for key in schema["required_keys"] if key not in data]
            if missing_keys:
                findings.append({"rule": "json.required_keys", "severity": "fail"})
            else:
                findings.append({"rule": "json.required_keys", "severity": "info"})
    except json.JSONDecodeError:
        findings.append({"rule": "json.parseable", "severity": "fail"})

    return findings
