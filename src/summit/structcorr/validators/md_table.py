def validate_markdown_table(payload: str):
    findings = []
    lines = payload.strip().split('\n')
    if not lines:
        return findings

    counts = [line.count('|') for line in lines]
    if len(set(counts)) > 1:
        findings.append({"rule": "md_table.column_consistency", "severity": "fail"})
    else:
        findings.append({"rule": "md_table.column_consistency", "severity": "info"})

    return findings
