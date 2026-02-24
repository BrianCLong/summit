#!/usr/bin/env python3
"""Run the Summit tooling agent and emit deterministic artifacts."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agents.tooling_agent import ToolingAgent, ToolingTaskConfig  # noqa: E402
from lib.artifact_writer import write_tooling_artifacts  # noqa: E402


def _feature_enabled() -> bool:
    return os.getenv("TOOLING_AGENT_ENABLED", "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run deterministic Summit tooling agent")
    parser.add_argument("--task", required=True, help="Task name")
    parser.add_argument("--output-dir", default="artifacts", help="Output directory")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    config = ToolingTaskConfig(
        task=args.task,
        repo_root=ROOT,
        enabled=_feature_enabled(),
        prompt_path=ROOT / "agents" / "prompts" / "base_prompt.md",
        git_sha=os.getenv("GITHUB_SHA", "local"),
    )

    result = ToolingAgent(config).run()

    write_tooling_artifacts(output_dir, result["report"], result["metrics"], result["stamp"])

    print(json.dumps({"evidence_id": result["report"]["evidence_id"], "output_dir": str(output_dir)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
