def validate_sql_structure(sql: str, rules: dict = None):
    findings = []
    if ";" in sql.strip(";"):
        findings.append({"rule": "sql.single_statement", "severity": "fail"})
    else:
        findings.append({"rule": "sql.single_statement", "severity": "info"})

    if "DROP " in sql.upper():
        findings.append({"rule": "sql.dangerous_statement", "severity": "fail"})
    else:
        findings.append({"rule": "sql.dangerous_statement", "severity": "info"})

    return findings
