def validate_markdown_table(data: str) -> list:
    findings = [{"rule": "md_table.integrity", "severity": "info"}]
    lines = data.strip().split('\n')
    if len(lines) > 2:
        num_cols = lines[0].count('|')
        for line in lines[1:]:
            if line.count('|') != num_cols:
                findings.append({"rule": "md_table.column_consistency", "severity": "fail"})
                return findings
    findings.append({"rule": "md_table.column_consistency", "severity": "info"})
    return findings
