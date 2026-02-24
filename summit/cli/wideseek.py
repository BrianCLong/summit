import argparse
import asyncio
import json
import os
import time
import uuid
from datetime import datetime, timezone
from typing import List

from summit.agents.wideseek import WideSeekOrchestrator, WideSeekBudgets
from summit.tools.wideseek import SearchTool, AccessTool, WideSeekPolicy

# Mock LLM for CLI run
async def cli_mock_llm(messages: List[dict]):
    # Check if this is the lead aggregator or a subagent
    last_msg = messages[-1]["content"]
    if "Create a final markdown report" in last_msg:
        return """
| Country | Capital |
| --- | --- |
| France | Paris |
| Germany | Berlin |
| Spain | Madrid |
"""
    else:
        # Subagent finding
        return "Found capital info."

async def run_wideseek(args):
    run_id = str(uuid.uuid4())
    print(f"Starting WideSeek Run: {run_id}")

    # Setup Policy & Tools
    policy = WideSeekPolicy(allowlist={"example.com"})
    tools = [SearchTool(policy), AccessTool(policy)]
    budgets = WideSeekBudgets(max_subagents=args.subagents)

    # Setup Orchestrator
    orch = WideSeekOrchestrator(llm=cli_mock_llm, tools=tools, budgets=budgets)

    # Execute
    start_time = time.time()
    result = await orch.run(args.query, subagents=args.subagents)
    duration = time.time() - start_time

    # Create Artifacts
    output_dir = os.path.join("evidence", f"run-{run_id}")
    os.makedirs(output_dir, exist_ok=True)

    # 1. Final Markdown
    with open(os.path.join(output_dir, "final.md"), "w") as f:
        f.write(result["final_md"])

    # 2. Metrics
    metrics = {
        "evidence_id": f"EVD-WIDESEEK-{run_id}",
        "metrics": {
            "duration_seconds": duration,
            "subagents": result["stats"]["subagents"],
            "tool_calls": 0 # TODO: wire up real count
        }
    }
    with open(os.path.join(output_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    # 3. Report
    report = {
        "evidence_id": f"EVD-WIDESEEK-{run_id}",
        "summary": "WideSeek R1 Run",
        "environment": "offline-fixtures",
        "backend": "mock-llm",
        "artifacts": ["final.md", "metrics.json", "stamp.json"],
        "query": args.query
    }
    with open(os.path.join(output_dir, "report.json"), "w") as f:
        json.dump(report, f, indent=2)

    # 4. Stamp (Time allowed here)
    stamp = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "run_id": run_id,
        "git_commit": "HEAD" # Placeholder
    }
    with open(os.path.join(output_dir, "stamp.json"), "w") as f:
        json.dump(stamp, f, indent=2)

    print(f"Run complete. Artifacts in {output_dir}")

def main():
    parser = argparse.ArgumentParser(description="WideSeek-R1 CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run")
    run_parser.add_argument("--query", type=str, required=True, help="Query to process")
    run_parser.add_argument("--subagents", type=int, default=3, help="Number of subagents")
    run_parser.add_argument("--offline-fixtures", action="store_true", help="Use offline fixtures")

    args = parser.parse_args()

    if args.command == "run":
        asyncio.run(run_wideseek(args))

if __name__ == "__main__":
    main()
