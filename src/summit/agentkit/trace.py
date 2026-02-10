from typing import List, Dict, Any

def to_mermaid(trace: List[Dict[str, Any]]) -> str:
    """Converts a trace to a mermaid sequence diagram."""
    lines = ["sequenceDiagram"]
    for step in trace:
        node = step["node"]
        lines.append(f"    Participant {node}")
        lines.append(f"    Note over {node}: State keys: {step['state_keys']}")
    return "\n".join(lines)
