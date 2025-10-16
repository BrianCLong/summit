from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from .evaluation import Evaluation


def render_markdown(
    evaluation: Evaluation,
    plan_path: Path | None = None,
    dataset_path: Path | None = None,
    title: str = "Sampling Audit Report",
) -> str:
    timestamp = datetime.now(timezone.utc).isoformat()
    lines = [
        f"# {title}",
        "",
        f"- Generated: `{timestamp}`",
    ]
    if plan_path:
        lines.append(f"- Sampling plan: `{plan_path}`")
    if dataset_path:
        lines.append(f"- Dataset: `{dataset_path}`")
    lines.extend(
        [
            "",
            "## Sampling Proof",
            "",
            f"- RNG seed: `{evaluation.proof['seed']}`",
            f"- RNG state hash: `{evaluation.proof['rng_state_hash']}`",
            "- Inclusion probabilities:",
        ]
    )
    for record_id, probability in sorted(evaluation.proof["inclusion_probabilities"].items()):
        lines.append(f"  - Record {record_id}: {probability:.6f}")
    lines.extend(
        [
            "",
            "## Bias and Variance Diagnostics",
            "",
            "| Metric | Population | Sample | Expected | Observed |",
            "| --- | --- | --- | --- | --- |",
            f"| Mean | {evaluation.population['mean']:.6f} | {evaluation.sample['mean']:.6f} | 0.000000 | {evaluation.observed_bias:.6f} |",
            f"| Variance | {evaluation.population['variance']:.6f} | {evaluation.sample['variance']:.6f} | {evaluation.expected_variance:.6f} | {evaluation.observed_variance:.6f} |",
        ]
    )
    lines.extend(
        [
            "",
            "## Notes",
            "",
            "- Expected bias of 0 indicates an unbiased estimator under the stated plan assumptions.",
            "- Variance diagnostics compare analytical formulas with empirical sample variance.",
        ]
    )
    return "\n".join(lines) + "\n"


def write_markdown(
    evaluation: Evaluation,
    output_path: Path,
    plan_path: Path | None = None,
    dataset_path: Path | None = None,
    title: str = "Sampling Audit Report",
) -> None:
    markdown = render_markdown(
        evaluation,
        plan_path=plan_path,
        dataset_path=dataset_path,
        title=title,
    )
    output_path.write_text(markdown)
