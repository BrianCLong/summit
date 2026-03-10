from typing import List, Dict

def validate_markdown_table(md: str) -> List[Dict[str, str]]:
    findings = []

    lines = md.strip().split("\n")
    if not lines:
        return findings

    num_cols = None
    consistent = True

    for line in lines:
        if "|" not in line: continue
        parts = [p.strip() for p in line.split("|")][1:-1] # assuming standard format
        if num_cols is None:
            num_cols = len(parts)
        elif len(parts) != num_cols:
            consistent = False
            break

    if consistent:
        findings.append({"rule": "md_table.column_consistency", "severity": "info"})
    else:
        findings.append({"rule": "md_table.column_consistency", "severity": "fail"})

    return findings
