from typing import Any, Dict, List
import re

def validate_sql_structure(data: str) -> List[Dict[str, str]]:
    findings = []
    if data.strip().count(";") > 1 or (data.strip().count(";") == 1 and not data.strip().endswith(";")):
        findings.append({"rule": "sql.single_statement", "severity": "fail"})
    else:
        findings.append({"rule": "sql.single_statement", "severity": "info"})

    if re.search(r'\b(DROP|DELETE|TRUNCATE|ALTER)\b', data, re.IGNORECASE):
        findings.append({"rule": "sql.dangerous_statement", "severity": "fail"})
    else:
        findings.append({"rule": "sql.dangerous_statement", "severity": "info"})
    return findings
