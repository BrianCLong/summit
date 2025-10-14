"""Reporting helpers for DocForge sample fixtures."""


def format_percentage(value):
    """Format a floating point value as a human readable percentage."""
    return f"{value * 100:.1f}%"


class ReportBuilder:
    """Accumulates rows and renders a markdown table."""

    def __init__(self):
        self._rows = []

    def add_row(self, label, value):
        """Append a label/value pair to the table rows."""
        self._rows.append((label, value))

    def render(self):
        """Render the accumulated rows as a GitHub flavored markdown table."""
        header = "| Metric | Value |\n| --- | --- |"
        body = "\n".join(f"| {label} | {value} |" for label, value in self._rows)
        return f"{header}\n{body}"
