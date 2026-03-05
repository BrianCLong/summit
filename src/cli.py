from __future__ import annotations

import argparse
import json
from pathlib import Path

from src.toolkit.sources.bellingcat import write_normalized_snapshot
from src.workflows.runner import run_workflow


def main() -> int:
    parser = argparse.ArgumentParser(prog="summit")
    sub = parser.add_subparsers(dest="command", required=True)

    toolkit = sub.add_parser("toolkit")
    toolkit_sub = toolkit.add_subparsers(dest="toolkit_command", required=True)
    sync = toolkit_sub.add_parser("sync")
    sync.add_argument("--source", choices=["bellingcat"], required=True)
    sync.add_argument("--out", required=True)

    run = sub.add_parser("run")
    run_sub = run.add_subparsers(dest="run_command", required=True)
    workflow = run_sub.add_parser("workflow")
    workflow.add_argument("workflow_path")
    workflow.add_argument("--input", required=True)

    args = parser.parse_args()

    if args.command == "toolkit" and args.toolkit_command == "sync":
        write_normalized_snapshot(args.out)
        return 0

    if args.command == "run" and args.run_command == "workflow":
        payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
        result = run_workflow(args.workflow_path, payload)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
