"""
Summit Integration Example: SRE v0.1

This script demonstrates how to integrate the Summit Reasoning Evaluator (SRE)
into a Summit/IntelGraph workflow. It simulates a Summit run, captures the
trace, converts it to an SRE Episode, and runs an evaluation.
"""

import sys
import json
from pathlib import Path
from datetime import datetime

# Add impl to path to simulate installed package
sys.path.append(str(Path.cwd() / "impl"))

from sre.models import Episode
from sre.metrics import TraceLengthMetric, ToolEfficiencyMetric

# --- Mock Summit Runtime ---
class SummitRunner:
    def run_workflow(self, input_data):
        """
        Simulates running a complex reasoning workflow in Summit.
        Returns a list of 'events' (Summit's native trace format).
        """
        print(f"Summit: Running workflow for input '{input_data}'...")
        # Simulating a multi-step execution
        events = [
            {"type": "start", "timestamp": datetime.now().isoformat()},
            {"type": "llm_thought", "content": "I need to check the user's balance."},
            {"type": "tool_call", "tool": "bank_api", "args": {"user": "alice"}},
            {"type": "tool_result", "result": {"balance": 1000}},
            {"type": "llm_thought", "content": "Balance is sufficient. Proceeding."},
            {"type": "end", "output": "Approved"}
        ]
        return events

# --- Integration Hook ---
def summit_to_sre(events, run_id="run-123") -> Episode:
    """
    Converts Summit events to SRE Episode Graph.
    """
    nodes = []
    edges = []
    last_node_id = None

    for i, evt in enumerate(events):
        node_id = f"node-{i}"
        node_type = "thought" # default
        content = ""
        metadata = {}

        if evt["type"] == "llm_thought":
            node_type = "thought"
            content = evt["content"]
        elif evt["type"] == "tool_call":
            node_type = "call"
            content = f"{evt['tool']}({evt['args']})"
            metadata = {"tool": evt["tool"]}
        elif evt["type"] == "tool_result":
            node_type = "observation"
            content = str(evt["result"])
        elif evt["type"] in ["start", "end"]:
            node_type = "system"
            content = evt.get("output", "Workflow Signal")

        nodes.append({
            "id": node_id,
            "type": node_type,
            "content": content,
            "metadata": metadata,
            "timestamp": evt.get("timestamp")
        })

        if last_node_id:
            edges.append({
                "source": last_node_id,
                "target": node_id,
                "relation": "follows"
            })
        last_node_id = node_id

    # Extract outcome
    outcome = next((e.get("output") for e in events if e["type"] == "end"), None)

    return Episode(
        episode_id=run_id,
        task_id="summit-task-001",
        run_config={"engine": "summit-v1"},
        outcome=outcome,
        graph={"nodes": nodes, "edges": edges}
    )

# --- Main Execution ---
def main():
    # 1. Run Summit
    runner = SummitRunner()
    raw_trace = runner.run_workflow("Approve Transaction")

    # 2. Convert to SRE
    print("Integration: Converting trace to SRE Episode...")
    episode = summit_to_sre(raw_trace)

    # 3. Evaluate
    print("Integration: Running SRE Evaluation...")
    metrics = [TraceLengthMetric(), ToolEfficiencyMetric()]
    results = {m.name: m.compute(episode) for m in metrics}

    print("\n--- Eval Report ---")
    print(json.dumps(results, indent=2))
    print("-------------------")

if __name__ == "__main__":
    main()
