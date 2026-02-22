import re
from typing import List, Dict

def parse_markdown_table(markdown: str) -> List[Dict[str, str]]:
    """
    Parses a markdown table into a list of dictionaries.
    Assumes standard markdown table format.
    """
    lines = markdown.strip().split('\n')
    table_lines = [line.strip() for line in lines if '|' in line]

    if len(table_lines) < 2:
        return []

    # Parse headers
    header_line = table_lines[0]
    headers = [h.strip() for h in header_line.strip('|').split('|')]

    # Skip separator line (usually ---|---|---)
    start_idx = 2 if len(table_lines) > 1 and '---' in table_lines[1] else 1

    rows = []
    for line in table_lines[start_idx:]:
        values = [v.strip() for v in line.strip('|').split('|')]
        # Handle mismatch in length by padding or truncating
        if len(values) < len(headers):
            values += [''] * (len(headers) - len(values))
        elif len(values) > len(headers):
            values = values[:len(headers)]

        row_dict = dict(zip(headers, values))
        rows.append(row_dict)

    return rows
