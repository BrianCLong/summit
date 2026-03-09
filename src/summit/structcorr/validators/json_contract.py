import json

def validate_json_contract(payload: str, rules: dict = None):
    findings = []
    try:
        data = json.loads(payload)
        findings.append({"rule": "json.parseable", "severity": "info"})

        if rules and "required_keys" in rules:
            if isinstance(data, dict):
                missing = [k for k in rules["required_keys"] if k not in data]
                if missing:
                    findings.append({"rule": "json.required_keys", "severity": "fail", "details": f"Missing: {missing}"})
                else:
                    findings.append({"rule": "json.required_keys", "severity": "info"})
            else:
                findings.append({"rule": "json.required_keys", "severity": "fail", "details": "Payload is not a dictionary"})
    except json.JSONDecodeError:
        findings.append({"rule": "json.parseable", "severity": "fail"})

    return findings
