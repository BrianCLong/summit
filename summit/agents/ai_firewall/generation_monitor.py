def detect_sql_injection(flow):
    if "user_input" in flow and "raw_sql_query" in flow:
        return True
    return False

def detect_vulnerabilities(code_flow):
    vulnerabilities = []
    if detect_sql_injection(code_flow):
        vulnerabilities.append("SQL injection risk")
    return vulnerabilities
