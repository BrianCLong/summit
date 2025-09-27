"""HTML report generation for the Pipeline Flakiness Detector."""
from __future__ import annotations

import html
import os
from dataclasses import dataclass
from typing import Iterable, List

from .core import StepAnalysis


@dataclass(frozen=True)
class ReportContext:
    title: str
    runs: int
    threshold: float
    analyses: List[StepAnalysis]


def _format_float(value: float) -> str:
    return f"{value:.6f}"


class HTMLReportBuilder:
    """Produce deterministic HTML summaries for PFD runs."""

    def __init__(self, analyses: Iterable[StepAnalysis], runs: int, threshold: float, title: str = "Pipeline Flakiness Report") -> None:
        self.context = ReportContext(
            title=title,
            runs=runs,
            threshold=threshold,
            analyses=list(analyses),
        )

    def build(self) -> str:
        ctx = self.context
        flagged = [analysis for analysis in ctx.analyses if analysis.flagged]
        rows = [self._render_row(analysis) for analysis in ctx.analyses]
        summary = self._render_summary(len(flagged), len(ctx.analyses))
        html_parts = [
            "<!DOCTYPE html>",
            "<html lang=\"en\">",
            "<head>",
            "<meta charset=\"utf-8\" />",
            f"<title>{html.escape(ctx.title)}</title>",
            "<style>",
            "body { font-family: Arial, sans-serif; margin: 2rem; }",
            "h1 { margin-bottom: 0.5rem; }",
            "table { border-collapse: collapse; width: 100%; margin-top: 1rem; }",
            "th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }",
            "th { background: #f5f5f5; }",
            ".flagged { background: #ffe6e6; }",
            ".summary { margin-top: 0.5rem; font-weight: bold; }",
            "code { font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; }",
            "</style>",
            "</head>",
            "<body>",
            f"<h1>{html.escape(ctx.title)}</h1>",
            f"<div class=\"summary\">Runs: {ctx.runs} &mdash; Threshold: {_format_float(ctx.threshold)}</div>",
            summary,
            "<table>",
            "<thead>",
            "<tr>",
            "<th>Step</th>",
            "<th>Flakiness</th>",
            "<th>Difference</th>",
            "<th>Variance</th>",
            "<th>Failures</th>",
            "<th>Blame</th>",
            "<th>Samples</th>",
            "</tr>",
            "</thead>",
            "<tbody>",
            *rows,
            "</tbody>",
            "</table>",
            "</body>",
            "</html>",
        ]
        return "\n".join(html_parts)

    def _render_summary(self, flagged_count: int, total: int) -> str:
        if total == 0:
            return "<div class=\"summary\">No steps executed.</div>"
        return (
            "<div class=\"summary\">"
            f"Flagged steps: {flagged_count} / {total}"
            "</div>"
        )

    def _render_row(self, analysis: StepAnalysis) -> str:
        row_class = " class=\"flagged\"" if analysis.flagged else ""
        blame_text = self._format_blame(analysis)
        samples_html = self._format_samples(analysis)
        return (
            f"<tr{row_class}>"
            f"<td>{html.escape(analysis.name)}</td>"
            f"<td>{_format_float(analysis.flakiness_score)}</td>"
            f"<td>{_format_float(analysis.difference_ratio)}</td>"
            f"<td>{self._format_variance(analysis)}</td>"
            f"<td>{analysis.failures} ({_format_float(analysis.failure_ratio)})</td>"
            f"<td>{blame_text}</td>"
            f"<td>{samples_html}</td>"
            "</tr>"
        )

    def _format_variance(self, analysis: StepAnalysis) -> str:
        if analysis.variance is None:
            return "n/a"
        return _format_float(float(analysis.variance))

    def _format_blame(self, analysis: StepAnalysis) -> str:
        if not analysis.blame_file:
            return "unknown"
        rel = os.path.relpath(analysis.blame_file)
        location = f"{rel}:{analysis.blame_line}" if analysis.blame_line else rel
        return f"<code>{html.escape(location)}</code>"

    def _format_samples(self, analysis: StepAnalysis) -> str:
        pieces: List[str] = []
        for sample in analysis.unique_value_samples:
            pieces.append(
                "<div>"
                f"{int(sample['count'])}x ({_format_float(float(sample['fraction']))}): "
                f"<code>{html.escape(sample['repr'])}</code>"
                "</div>"
            )
        if analysis.exceptions:
            for exc in analysis.exceptions:
                pieces.append(f"<div><strong>Exception:</strong> {html.escape(exc)}</div>")
        if not pieces:
            pieces.append("<div>no samples</div>")
        return "".join(pieces)

    def to_file(self, path: str) -> None:
        html_text = self.build()
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(html_text)


__all__ = ["HTMLReportBuilder"]
