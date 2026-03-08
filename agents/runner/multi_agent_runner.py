from __future__ import annotations

import argparse
from pathlib import Path

from multi_agent import run_task


def main() -> int:
    parser = argparse.ArgumentParser(description="Run deterministic Summit multi-agent workflow")
    parser.add_argument("--task", required=True, help="Task to execute")
    parser.add_argument("--out", default="artifacts", help="Output directory")
    parser.add_argument("--evidence-id", default="EVD-SUMMIT-MULTIAGENT-001")
    args = parser.parse_args()

    run_task(task=args.task, out_dir=Path(args.out), evidence_id=args.evidence_id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
