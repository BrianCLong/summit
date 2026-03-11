def validate_sql_structure(data: str) -> list:
    findings = [{"rule": "sql.parse", "severity": "info"}]
    if data.count(';') > 1:
        findings.append({"rule": "sql.single_statement", "severity": "fail"})
    else:
        findings.append({"rule": "sql.single_statement", "severity": "info"})

    if "DROP " in data.upper():
        findings.append({"rule": "sql.dangerous_statement", "severity": "fail"})
    else:
        findings.append({"rule": "sql.dangerous_statement", "severity": "info"})
    return findings
