"""Command line interface for the Counterfactual Evaluation Harness."""
from __future__ import annotations

import argparse
import json
from typing import Callable, Dict

from sklearn.linear_model import LogisticRegression

from .datasets import load_breast_cancer_demo, load_synthetic_demo
from .evaluation import CounterfactualEvaluationHarness

try:  # pragma: no cover - optional dependency
    from xgboost import XGBClassifier
except ImportError:  # pragma: no cover
    XGBClassifier = None


_DATASETS: Dict[str, Callable] = {
    "synthetic": load_synthetic_demo,
    "breast_cancer": load_breast_cancer_demo,
}


def _build_model(name: str, random_state: int):
    if name == "logistic":
        return LogisticRegression(max_iter=1000, random_state=random_state)
    if name == "xgboost":
        if XGBClassifier is None:
            raise RuntimeError("xgboost is not installed in this environment")
        return XGBClassifier(
            max_depth=3,
            learning_rate=0.1,
            n_estimators=200,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=random_state,
            eval_metric="logloss",
            use_label_encoder=False,
        )
    raise ValueError(f"Unsupported model '{name}'")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Counterfactual Evaluation Harness")
    subparsers = parser.add_subparsers(dest="command", required=True)

    report_parser = subparsers.add_parser("report", help="Run CEH and produce a report")
    report_parser.add_argument(
        "--dataset",
        choices=sorted(_DATASETS.keys()),
        default="synthetic",
        help="Dataset to evaluate",
    )
    report_parser.add_argument(
        "--model",
        choices=["logistic", "xgboost"],
        default="logistic",
        help="Model type to train",
    )
    report_parser.add_argument(
        "--lambda-irm",
        type=float,
        default=1.0,
        help="Strength of the IRM penalty",
    )
    report_parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Optional path to save the JSON report",
    )
    report_parser.add_argument(
        "--seed",
        type=int,
        default=0,
        help="Random seed for reproducibility",
    )

    datasets_parser = subparsers.add_parser("datasets", help="List available demo datasets")
    datasets_parser.add_argument("--json", action="store_true", help="Return JSON output")

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "datasets":
        payload = {
            name: {
                "description": _DATASETS[name]().description,
                "features": _DATASETS[name]().data.columns.tolist(),
            }
            for name in sorted(_DATASETS)
        }
        if args.json:
            print(json.dumps(payload, indent=2))
        else:
            for name, meta in payload.items():
                print(f"{name}: {meta['description']} ({len(meta['features'])} features)")
        return 0

    dataset = _DATASETS[args.dataset]()
    model = _build_model(args.model, args.seed)
    harness = CounterfactualEvaluationHarness(model, dataset, random_state=args.seed)
    report = harness.run_full_evaluation(lambda_irm=args.lambda_irm)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=2)
        print(f"Report saved to {args.output}")
    else:
        print(json.dumps(report, indent=2))

    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
