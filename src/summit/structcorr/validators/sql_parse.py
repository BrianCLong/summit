from typing import List, Dict

def validate_sql_structure(sql: str) -> List[Dict[str, str]]:
    findings = []

    if ";" in sql.strip().strip(";"):
        findings.append({"rule": "sql.single_statement", "severity": "fail"})
    else:
        findings.append({"rule": "sql.single_statement", "severity": "info"})

    upper_sql = sql.upper()
    if "DROP " in upper_sql or "DELETE " in upper_sql or "TRUNCATE " in upper_sql:
        findings.append({"rule": "sql.dangerous_statement", "severity": "fail"})
    else:
        findings.append({"rule": "sql.dangerous_statement", "severity": "info"})

    return findings
