"""Heatmap rendering utilities for privacy violation reports."""

from __future__ import annotations

from pathlib import Path

from .report import PrivacyEvaluationReport


def _colour_for_intensity(intensity: float) -> str:
    intensity = max(0.0, min(1.0, intensity))
    red = int(255 * intensity)
    green = int(255 * (1.0 - intensity / 2.0))
    blue = int(255 * (1.0 - intensity))
    return f"#{red:02x}{green:02x}{blue:02x}"


def _svg_rect(x: float, y: float, width: float, height: float, fill: str) -> str:
    return f'<rect x="{x}" y="{y}" width="{width}" height="{height}" fill="{fill}" />'


def _svg_text(x: float, y: float, text: str, *, anchor: str = "middle") -> str:
    escaped = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return (
        f'<text x="{x}" y="{y}" text-anchor="{anchor}" '
        f'font-family="Inter, Arial" font-size="12">{escaped}</text>'
    )


def generate_violation_heatmap(
    report: PrivacyEvaluationReport,
    metric: str,
    output_path: str | Path,
    *,
    seed: int | None = None,
) -> Path:
    """Generate an SVG heatmap visualising violations for ``metric``.

    The function returns the path to the rendered SVG file. Heatmaps are stable
    across runs; a ``seed`` parameter is accepted for API compatibility with
    callers that expect deterministic pseudo-random behaviour.
    """

    _ = seed  # No random elements are currently required.

    row_labels, column_labels, matrix = report.heatmap_matrix(metric)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if not row_labels:
        svg = [
            "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"320\" height=\"80\">",
            _svg_text(160, 40, "No violations detected", anchor="middle"),
            "</svg>",
        ]
        output_path.write_text("\n".join(svg), encoding="utf-8")
        return output_path

    cell_size = 40
    label_height = 30
    left_margin = 160
    top_margin = 20

    width = left_margin + cell_size * len(column_labels) + 20
    height = top_margin + label_height + cell_size * len(row_labels) + 20

    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}">',
        _svg_text(left_margin + (cell_size * len(column_labels)) / 2, 15, f"Violations: {metric}"),
    ]

    for idx, column in enumerate(column_labels):
        x = left_margin + idx * cell_size + cell_size / 2
        svg.append(_svg_text(x, top_margin + label_height - 8, column))

    for row_idx, label in enumerate(row_labels):
        y = top_margin + label_height + row_idx * cell_size + cell_size / 2
        svg.append(_svg_text(left_margin - 10, y + 4, label, anchor="end"))
        for col_idx, intensity in enumerate(matrix[row_idx]):
            x = left_margin + col_idx * cell_size
            y_rect = top_margin + label_height + row_idx * cell_size
            colour = _colour_for_intensity(intensity)
            svg.append(_svg_rect(x, y_rect, cell_size, cell_size, colour))

    svg.append("</svg>")
    output_path.write_text("\n".join(svg), encoding="utf-8")
    return output_path


__all__ = ["generate_violation_heatmap"]
