#!/usr/bin/env python3
"""Run a YAML workflow against a given case."""

import argparse
import json
from pathlib import Path

import yaml  # type: ignore

from analysis.copilot_agent import CopilotAgent


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Execute copilot workflow")
    parser.add_argument("workflow", help="Path to workflow YAML")
    parser.add_argument("--case", dest="case_id", required=True, help="Case identifier")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    steps = yaml.safe_load(Path(args.workflow).read_text())["steps"]
    agent = CopilotAgent()
    for step in steps:
        prompt = step["prompt"]
        response = agent.ask(args.case_id, graph_snippet="", question=prompt)
        print(json.dumps({"step": step["id"], "response": response}, indent=2))


if __name__ == "__main__":
    main()
