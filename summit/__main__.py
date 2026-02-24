from __future__ import annotations

import argparse
import json
from pathlib import Path

from summit.agents.computer_use import run_plan_file
from summit.flags import is_feature_enabled
from summit.security_debt import analyze_security_debt
from summit.vitals.cli import main as vitals_main


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="summit")
    subcommands = parser.add_subparsers(dest="command", required=True)

    analyze = subcommands.add_parser("analyze", help="Run deterministic analyzers")
    analyze.add_argument(
        "--security-debt",
        action="store_true",
        help="Run security debt analysis and emit deterministic artifacts.",
    )
    analyze.add_argument(
        "--output-dir",
        default=".",
        help="Directory where report.json/metrics.json/stamp.json/security_debt_ledger.json are written.",
    )
    analyze.add_argument(
        "--gate-config",
        default="summit/ci/gates/security_debt.yml",
        help="Path to security debt gate configuration.",
    )
    analyze.add_argument(
        "--base-ref",
        default=None,
        help="Optional git base ref used to determine changed files and dependency additions.",
    )

    vitals = subcommands.add_parser("vitals", help="Run deterministic LLM vitals harness")
    vitals_sub = vitals.add_subparsers(dest="vitals_command", required=True)
    eval_cmd = vitals_sub.add_parser("eval", help="Evaluate configured LLM fixtures with vitals scoring")
    eval_cmd.add_argument("--schema", default="evaluation/vitals/schema.yaml")
    eval_cmd.add_argument("--corpus", default="evaluation/vitals/benchmark_corpus.jsonl")
    eval_cmd.add_argument("--fixtures", default="evaluation/vitals/provider_fixtures.json")
    eval_cmd.add_argument("--out-dir", default="artifacts/llm-vitals")
    eval_cmd.add_argument("--baseline", default="evaluation/vitals/baseline_metrics.json")
    eval_cmd.add_argument("--max-regression", type=float, default=0.05)
    eval_cmd.add_argument("--model", action="append", default=[])
    eval_cmd.add_argument("--expected-corpus-sha", default=None)
    eval_cmd.add_argument("--force", action="store_true")

    agent = subcommands.add_parser("agent", help="Run controlled Summit agents")
    agent_sub = agent.add_subparsers(dest="agent_command", required=True)
    run_cmd = agent_sub.add_parser(
        "run",
        help="Run an agent plan file (YAML/JSON).",
    )
    run_cmd.add_argument("plan", help="Path to a plan file")
    run_cmd.add_argument(
        "--agent",
        default="computer_use",
        choices=["computer_use"],
        help="Agent runtime to execute",
    )
    run_cmd.add_argument(
        "--output-dir",
        default="artifacts/computer_use",
        help="Directory where report.json/metrics.json/stamp.json are written.",
    )

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "vitals":
        forwarded: list[str] = [
            "eval",
            "--schema",
            args.schema,
            "--corpus",
            args.corpus,
            "--fixtures",
            args.fixtures,
            "--out-dir",
            args.out_dir,
            "--baseline",
            args.baseline,
            "--max-regression",
            str(args.max_regression),
        ]
        if args.expected_corpus_sha:
            forwarded.extend(["--expected-corpus-sha", args.expected_corpus_sha])
        for model in args.model:
            forwarded.extend(["--model", model])
        if args.force:
            forwarded.append("--force")
        return vitals_main(forwarded)

    if args.command == "agent":
        if args.agent != "computer_use":
            parser.error("Unsupported agent runtime")

        if not is_feature_enabled("COMPUTER_USE_AGENT_ENABLED", default=False):
            print(
                json.dumps(
                    {
                        "action": "skip",
                        "feature_flag": "COMPUTER_USE_AGENT_ENABLED",
                        "reason": "feature_flag_disabled",
                    },
                    indent=2,
                    sort_keys=True,
                )
            )
            return 2

        result = run_plan_file(
            plan_path=Path(args.plan),
            output_dir=Path(args.output_dir),
        )
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0

    if args.command != "analyze":
        parser.error("Unsupported command")

    if not args.security_debt:
        parser.error("Use --security-debt to run the security debt analyzer.")

    result = analyze_security_debt(
        repo_root=Path.cwd(),
        output_dir=Path(args.output_dir),
        gate_config_path=Path(args.gate_config),
        base_ref=args.base_ref,
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
