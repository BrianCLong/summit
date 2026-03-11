import json

def validate_json_contract(data: str, constraints: dict = None) -> list:
    findings = []
    try:
        parsed = json.loads(data)
        findings.append({"rule": "json.parseable", "severity": "info"})
        if constraints and "required_keys" in constraints:
            for key in constraints["required_keys"]:
                if key not in parsed:
                    findings.append({"rule": "json.required_keys", "severity": "fail"})
                else:
                    findings.append({"rule": "json.required_keys", "severity": "info"})
    except json.JSONDecodeError:
        findings.append({"rule": "json.parseable", "severity": "fail"})
    return findings
