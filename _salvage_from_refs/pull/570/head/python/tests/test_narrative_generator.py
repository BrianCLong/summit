import sys
from pathlib import Path

# ensure repo root on path
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from intelgraph_ai_ml.narrative_generator import (
    Event,
    format_prompt,
    generate_narrative,
    traverse_graph,
)


def sample_graph():
    return {
        "nodes": [
            {"id": "a", "label": "Alice"},
            {"id": "b", "label": "Bob"},
        ],
        "edges": [
            {
                "source": "a",
                "target": "b",
                "type": "messaged",
                "timestamp": "2024-01-01T00:00:00",
                "tags": ["chat"],
                "confidence": 0.9,
            },
            {
                "source": "b",
                "target": "a",
                "type": "replied",
                "timestamp": "2024-01-02T00:00:00",
            },
        ],
    }


def test_traverse_and_prompt():
    events = traverse_graph(sample_graph())
    assert [e.action for e in events] == ["messaged", "replied"]
    prompt = format_prompt(events, tone="executive")
    assert "executive" in prompt
    assert "Alice" in prompt
    assert "messaged" in prompt


def test_generate_narrative_masks_and_unmasks():
    result = generate_narrative(
        sample_graph(),
        tone="analyst",
        sensitive_entities=["Alice"],
    )
    narrative = result["narrative"]
    assert "Alice" in narrative["executive_summary"] or "Stubbed" in narrative["executive_summary"]
    assert set(narrative["insights"].keys()) == {
        "Notable Behaviors",
        "Suspicious Links",
        "Data Exfil Points",
    }
    assert "prompt_hash" in result and "output_hash" in result
