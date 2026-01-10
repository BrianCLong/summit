from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict

from .runner import JobRunner

BASE_DIR = Path(__file__).resolve().parents[2]
STATE_ROOT = BASE_DIR / "var/maestro"
AUDIT_LOG = STATE_ROOT / "audit.log"


def load_job_spec(path: str, runner: JobRunner):
    return runner.load_spec_from_path(Path(path))


def cmd_submit(args: argparse.Namespace, runner: JobRunner) -> None:
    spec = load_job_spec(args.file, runner)
    job_id = runner.submit(spec)
    print(json.dumps({"job_id": job_id, "trace_id": spec.trace_id, "status": runner.store.latest_state(job_id)}, indent=2))


def cmd_status(args: argparse.Namespace, runner: JobRunner) -> None:
    events = runner.store.get_events(args.job_id)
    if not events:
        print(f"Job {args.job_id} not found")
        return
    print(json.dumps(events, indent=2))


def cmd_logs(args: argparse.Namespace, runner: JobRunner) -> None:
    logs = runner.store.read_all_logs(args.job_id)
    if not logs:
        print(f"No logs for job {args.job_id}")
        return
    for name, content in logs.items():
        print(f"== {name} ==\n{content}\n")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Maestro CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    submit = sub.add_parser("submit", help="Submit a job spec (JSON/YAML)")
    submit.add_argument("file", help="Path to job spec file")
    submit.set_defaults(func=cmd_submit)

    status = sub.add_parser("status", help="Show job status history")
    status.add_argument("job_id", help="Job identifier")
    status.set_defaults(func=cmd_status)

    logs = sub.add_parser("logs", help="Show step logs for a job")
    logs.add_argument("job_id", help="Job identifier")
    logs.set_defaults(func=cmd_logs)
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    runner = JobRunner(STATE_ROOT, AUDIT_LOG)
    args.func(args, runner)


if __name__ == "__main__":
    main()
