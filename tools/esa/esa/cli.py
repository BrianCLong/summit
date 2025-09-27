from __future__ import annotations

import argparse
import json
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from .evaluation import Evaluation, evaluate
from .reporting import render_markdown, write_markdown
from .sampling import SamplingPlan
from .utils import load_dataset, load_json_or_yaml


class CLIError(Exception):
    pass


def load_plan(config_path: Path) -> Dict[str, Any]:
    if not config_path.exists():
        raise CLIError(f"Sampling plan file not found: {config_path}")
    return load_json_or_yaml(config_path)


def evaluate_plan(plan_cfg: Dict[str, Any], dataset_path: Path, metric: str) -> Evaluation:
    records = load_dataset(dataset_path)
    plan = SamplingPlan.from_config(plan_cfg)
    result = plan.execute(records)
    return evaluate(result, records, metric)


def evaluation_to_dict(evaluation: Evaluation) -> Dict[str, Any]:
    return {
        "plan_type": evaluation.plan_type,
        "proof": evaluation.proof,
        "population": evaluation.population,
        "sample": evaluation.sample,
        "expected_bias": evaluation.expected_bias,
        "observed_bias": evaluation.observed_bias,
        "expected_variance": evaluation.expected_variance,
        "observed_variance": evaluation.observed_variance,
    }


def handle_evaluate(args: argparse.Namespace) -> int:
    plan_cfg = load_plan(Path(args.plan))
    evaluation = evaluate_plan(plan_cfg, Path(args.dataset), args.metric)
    payload = evaluation_to_dict(evaluation)
    if args.output:
        Path(args.output).write_text(json.dumps(payload, indent=2))
    else:
        json.dump(payload, sys.stdout, indent=2)
        sys.stdout.write("\n")
    return 0


def parse_variant(token: str) -> tuple[str, List[str]]:
    if "=" not in token:
        raise CLIError("Variants must be in key=value1,value2 format")
    key, values = token.split("=", 1)
    return key, [value.strip() for value in values.split(",") if value.strip()]


def apply_variant(base: Dict[str, Any], key: str, value: str) -> Dict[str, Any]:
    variant = deepcopy(base)
    cursor: Dict[str, Any] = variant
    parts = key.split(".")
    for part in parts[:-1]:
        if part not in cursor or not isinstance(cursor[part], dict):
            cursor[part] = {}
        cursor = cursor[part]
    final_key = parts[-1]
    parsed_value: Any
    if value.lower() in {"true", "false"}:
        parsed_value = value.lower() == "true"
    else:
        try:
            if "." in value:
                parsed_value = float(value)
            else:
                parsed_value = int(value)
        except ValueError:
            parsed_value = value
    cursor[final_key] = parsed_value
    return variant


def handle_simulate(args: argparse.Namespace) -> int:
    base_plan = load_plan(Path(args.plan))
    dataset_path = Path(args.dataset)
    variants: Dict[str, List[str]] = {}
    for token in args.vary or []:
        key, values = parse_variant(token)
        variants[key] = values

    results: List[Dict[str, Any]] = []
    for key, values in variants.items():
        for value in values:
            plan_cfg = apply_variant(base_plan, key, value)
            evaluation = evaluate_plan(plan_cfg, dataset_path, args.metric)
            payload = evaluation_to_dict(evaluation)
            payload["variant"] = {key: value}
            results.append(payload)
    json.dump(results, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


def handle_report(args: argparse.Namespace) -> int:
    plan_cfg = load_plan(Path(args.plan))
    dataset_path = Path(args.dataset)
    evaluation = evaluate_plan(plan_cfg, dataset_path, args.metric)
    output_path = Path(args.output)
    if args.stdout:
        sys.stdout.write(
            render_markdown(
                evaluation,
                plan_path=Path(args.plan),
                dataset_path=dataset_path,
                title=args.title or "Sampling Audit Report",
            )
        )
    else:
        write_markdown(
            evaluation,
            output_path,
            plan_path=Path(args.plan),
            dataset_path=dataset_path,
            title=args.title or "Sampling Audit Report",
        )
    return 0


def handle_ci_check(args: argparse.Namespace) -> int:
    plan_cfg = load_plan(Path(args.plan))
    dataset_path = Path(args.dataset)
    evaluation = evaluate_plan(plan_cfg, dataset_path, args.metric)
    tolerances = load_json_or_yaml(Path(args.tolerances)) if args.tolerances else {}
    bias_tol = float(tolerances.get("bias", args.bias_tolerance))
    variance_tol = float(tolerances.get("variance", args.variance_tolerance))
    bias_ok = abs(evaluation.observed_bias) <= bias_tol
    variance_ok = evaluation.observed_variance <= variance_tol
    if not (bias_ok and variance_ok):
        message = "Sampling plan failed tolerances:"
        if not bias_ok:
            message += f" bias {evaluation.observed_bias:.6f} exceeds {bias_tol}"
        if not variance_ok:
            message += f" variance {evaluation.observed_variance:.6f} exceeds {variance_tol}"
        raise CLIError(message)
    if args.output:
        Path(args.output).write_text(json.dumps(evaluation_to_dict(evaluation), indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Explainable Sampling Auditor")
    subparsers = parser.add_subparsers(dest="command", required=True)

    eval_parser = subparsers.add_parser("evaluate", help="Evaluate a sampling plan")
    eval_parser.add_argument("--plan", required=True, help="Path to sampling plan config")
    eval_parser.add_argument("--dataset", required=True, help="Path to CSV dataset")
    eval_parser.add_argument("--metric", required=True, help="Numeric metric column to evaluate")
    eval_parser.add_argument("--output", help="Optional JSON output path")
    eval_parser.set_defaults(func=handle_evaluate)

    sim_parser = subparsers.add_parser("simulate", help="Run what-if simulations")
    sim_parser.add_argument("--plan", required=True, help="Base sampling plan config")
    sim_parser.add_argument("--dataset", required=True, help="Path to CSV dataset")
    sim_parser.add_argument("--metric", required=True, help="Metric column")
    sim_parser.add_argument(
        "--vary",
        nargs="*",
        help="Variant specifications like sample_size=100,200 or stratified.allocations.A=5",
    )
    sim_parser.set_defaults(func=handle_simulate)

    report_parser = subparsers.add_parser("report", help="Generate Markdown report")
    report_parser.add_argument("--plan", required=True)
    report_parser.add_argument("--dataset", required=True)
    report_parser.add_argument("--metric", required=True)
    report_parser.add_argument("--output", required=True)
    report_parser.add_argument("--title", help="Report title")
    report_parser.add_argument("--stdout", action="store_true", help="Print report to stdout")
    report_parser.set_defaults(func=handle_report)

    gate_parser = subparsers.add_parser("ci-check", help="Fail when diagnostics exceed tolerances")
    gate_parser.add_argument("--plan", required=True)
    gate_parser.add_argument("--dataset", required=True)
    gate_parser.add_argument("--metric", required=True)
    gate_parser.add_argument("--tolerances", help="Path to JSON/YAML tolerance config")
    gate_parser.add_argument("--bias-tolerance", type=float, default=0.01)
    gate_parser.add_argument("--variance-tolerance", type=float, default=1.0)
    gate_parser.add_argument("--output", help="Optional JSON export path")
    gate_parser.set_defaults(func=handle_ci_check)

    return parser


def main(argv: Optional[Iterable[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except CLIError as exc:  # type: ignore[attr-defined]
        parser.error(str(exc))
        return 1


if __name__ == "__main__":
    sys.exit(main())
