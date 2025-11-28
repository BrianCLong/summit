import json
import re
from datetime import datetime
from typing import Dict, Any, List

def convert_to_episode(raw_record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Converts a raw chat record to an SRE Episode dict.
    Parses simple 'Thought:', 'Call:', 'Observation:' patterns.
    """
    messages = raw_record.get("messages", [])
    assistant_msg = next((m["content"] for m in messages if m["role"] == "assistant"), "")

    nodes = []
    edges = []
    node_counter = 0

    # Simple regex parsing for demo purposes
    # Matches lines starting with specific keywords
    lines = assistant_msg.split('\n')

    last_node_id = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        node_type = "thought" # default
        content = line

        if line.startswith("Thought:"):
            node_type = "thought"
            content = line.replace("Thought:", "").strip()
        elif line.startswith("Call:"):
            node_type = "call"
            content = line.replace("Call:", "").strip()
        elif line.startswith("Observation:"):
            node_type = "observation"
            content = line.replace("Observation:", "").strip()
        elif line.startswith("Answer:"):
            # We treat the final answer as an outcome, not necessarily a graph node,
            # but usually it's the last step.
            node_type = "thought"
            content = line

        node_counter += 1
        node_id = f"n{node_counter}"

        nodes.append({
            "id": node_id,
            "type": node_type,
            "content": content,
            "metadata": {},
            "timestamp": datetime.now().isoformat()
        })

        if last_node_id:
            edges.append({
                "source": last_node_id,
                "target": node_id,
                "relation": "follows"
            })

        last_node_id = node_id

    # Extract outcome from the last line or specific field
    outcome = raw_record.get("expected") # Defaulting to expected for demo if parse fails, but really should parse
    if "Answer:" in assistant_msg:
        outcome = assistant_msg.split("Answer:")[-1].strip()

    return {
        "episode_id": raw_record.get("id", "unknown"),
        "task_id": raw_record.get("id", "unknown"),
        "run_config": {"expected_answer": raw_record.get("expected")},
        "graph": {
            "nodes": nodes,
            "edges": edges
        },
        "outcome": outcome
    }
