from __future__ import annotations


def _table_lines(payload: str) -> list[str]:
    return [line.strip() for line in payload.splitlines() if line.strip().startswith("|")]


def _count_cells(line: str) -> int:
    trimmed = line.strip().strip("|")
    if not trimmed:
        return 0
    return len([cell for cell in trimmed.split("|")])


def validate_markdown_table(payload: str) -> list[dict[str, object]]:
    lines = _table_lines(payload)
    if len(lines) < 2:
        return [
            {
                "rule": "md_table.present",
                "severity": "fail",
                "message": "Markdown table must include header and separator",
                "meta": {"line_count": len(lines)},
            }
        ]

    header_cells = _count_cells(lines[0])
    sep_line = lines[1].strip().strip("|").replace(" ", "")
    separator_ok = all(chunk.startswith("-") and len(chunk) >= 3 for chunk in sep_line.split("|"))

    findings: list[dict[str, object]] = [
        {
            "rule": "md_table.header_separator",
            "severity": "info" if separator_ok else "fail",
            "message": "Header separator is valid" if separator_ok else "Header separator missing/invalid",
            "meta": {},
        }
    ]

    ragged_rows: list[int] = []
    for idx, line in enumerate(lines[2:], start=3):
        if _count_cells(line) != header_cells:
            ragged_rows.append(idx)

    findings.append(
        {
            "rule": "md_table.column_consistency",
            "severity": "info" if not ragged_rows else "fail",
            "message": "Column counts consistent" if not ragged_rows else "Ragged table rows detected",
            "meta": {"ragged_rows": ragged_rows, "expected_columns": header_cells},
        }
    )
    return findings
