import argparse
import json
from pathlib import Path
from typing import Any

from .engine import RunbookEngine
from .storage import Storage


def parse_params(param_list) -> dict[str, Any]:
    params: dict[str, Any] = {}
    for item in param_list or []:
        if "=" not in item:
            continue
        key, value = item.split("=", 1)
        params[key] = coerce(value)
    return params


def coerce(value: str) -> Any:
    lowered = value.lower()
    if lowered in {"true", "false"}:
        return lowered == "true"
    try:
        return int(value)
    except ValueError:
        try:
            return float(value)
        except ValueError:
            return value


def print_state(state_path: Path) -> None:
    state = json.loads(state_path.read_text())
    print(json.dumps(state, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Runbook prover controller")
    sub = parser.add_subparsers(dest="command", required=True)

    run_cmd = sub.add_parser("run", help="Execute a runbook")
    run_cmd.add_argument("runbook", type=Path)
    run_cmd.add_argument("--param", action="append", help="Override parameters (key=value)")

    resume_cmd = sub.add_parser("resume", help="Resume a previous run")
    resume_cmd.add_argument("runbook", type=Path)
    resume_cmd.add_argument("--run", required=True)

    replay_cmd = sub.add_parser("replay", help="Replay logs for a run")
    replay_cmd.add_argument("--run", required=True)

    verify_cmd = sub.add_parser("verify", help="Verify a proof bundle")
    verify_cmd.add_argument("--run", required=True)

    list_cmd = sub.add_parser("list", help="List available runs")

    return parser


def cli(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    base_path = Path(__file__).resolve().parent
    engine = RunbookEngine(base_path)
    storage = Storage(base_path / "runs")

    if args.command == "run":
        params = parse_params(args.param)
        state = engine.run(args.runbook, params)
        print(f"run complete: {state.run_id} -> proof {state.proof_path}")
    elif args.command == "resume":
        params = parse_params(args.param)
        state = engine.run(args.runbook, params, resume_run_id=args.run)
        print(f"run resumed: {state.run_id} -> proof {state.proof_path}")
    elif args.command == "replay":
        state = storage.load_run(args.run)
        for step_id, result in state.steps.items():
            print(f"[{step_id}] {result.status}")
            for log in result.logs:
                print(f"  - {log}")
    elif args.command == "verify":
        state = storage.load_run(args.run)
        proof_path = Path(state.proof_path) if state.proof_path else None
        if not proof_path or not proof_path.exists():
            print("no proof bundle available")
            return
        proof = json.loads(proof_path.read_text())
        status = proof.get("exports_allowed")
        print(json.dumps(proof, indent=2))
        if not status:
            print("proof gate blocked export; ombuds review token present")
    elif args.command == "list":
        for path in storage.list_runs():
            print(path.stem)


if __name__ == "__main__":
    cli()
