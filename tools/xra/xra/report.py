"""Audit report generation helpers."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Iterable, List

from .explanations import Explanation


def _format_metric_table(metrics: dict, key: str) -> str:
    rows: List[str] = []
    rows.append("| k | Baseline | Candidate | Δ |")
    rows.append("|---|----------|-----------|---|")
    for k in metrics["k_values"]:
        base = metrics["baseline"][key][k].average
        cand = metrics["candidate"][key][k].average
        delta = cand - base
        rows.append(f"| {k} | {base:.3f} | {cand:.3f} | {delta:+.3f} |")
    return "\n".join(rows)


def _format_alerts(alerts: Iterable[dict]) -> str:
    content: List[str] = []
    for alert in alerts:
        details = ", ".join(
            f"{name}={value}" for name, value in alert.items() if name not in {"type", "severity", "message"}
        )
        meta = f"**{alert['severity'].upper()}** – {alert['message']}"
        if details:
            meta += f" ({details})"
        content.append(f"- `{alert['type']}`: {meta}")
    return "\n".join(content) if content else "- No alerts triggered."


def generate_markdown_report(
    baseline_version: str,
    candidate_version: str,
    metrics: dict,
    explanations: Iterable[Explanation],
    alerts: Iterable[dict],
    output_path: str | Path | None = None,
) -> str:
    """Create a Markdown audit report."""

    timestamp = datetime.utcnow().isoformat(timespec="seconds") + "Z"
    exposure = metrics["baseline"]["exposure"], metrics["candidate"]["exposure"]
    report = [
        f"# Explainable Ranking Audit", 
        "", 
        f"- Generated: {timestamp}",
        f"- Baseline version: **{baseline_version}**",
        f"- Candidate version: **{candidate_version}**",
        "",
        "## Bias & Coverage Metrics",
        "",
        "### Exposure Disparity",
        "",
        "| System | Ratio | Max Gap |",
        "|--------|-------|---------|",
        f"| {baseline_version} | {exposure[0]['ratio']:.3f} | {exposure[0]['max_gap']:.3f} |",
        f"| {candidate_version} | {exposure[1]['ratio']:.3f} | {exposure[1]['max_gap']:.3f} |",
        "",
        "### Fairness@k",
        "",
        _format_metric_table(metrics, "fairness"),
        "",
        "### Coverage@k",
        "",
        _format_metric_table(metrics, "coverage"),
        "",
        "## Alerts",
        "",
        _format_alerts(alerts),
        "",
        "## Rank Shift Explanations",
        "",
    ]

    for explanation in explanations:
        report.extend(
            [
                f"### Query `{explanation.query_id}` – Document `{explanation.doc_id}`",
                "",
                f"- Baseline rank: {explanation.baseline_rank}",
                f"- Candidate rank: {explanation.candidate_rank}",
                f"- Rank shift: {explanation.rank_shift:+d}",
                f"- Predicted score (linear surrogate): {explanation.predicted_score:.3f}",
                "",
                "#### SHAP-lite contributions",
                "",
            ]
        )
        if explanation.shap_contributions:
            report.append("| Feature | Contribution |")
            report.append("|---------|--------------|")
            for name, value in sorted(explanation.shap_contributions.items(), key=lambda item: -abs(item[1])):
                report.append(f"| {name} | {value:+.4f} |")
        else:
            report.append("(No feature contributions available.)")
        report.extend(["", "#### Feature ablations", ""])
        if explanation.ablation_effects:
            report.append("| Feature | Score delta |")
            report.append("|---------|-------------|")
            for name, value in sorted(explanation.ablation_effects.items(), key=lambda item: -abs(item[1])):
                report.append(f"| {name} | {value:+.4f} |")
        else:
            report.append("(No ablation effects computed.)")
        report.append("")

    content = "\n".join(report)
    if output_path:
        path = Path(output_path)
        path.write_text(content, encoding="utf8")
    return content
