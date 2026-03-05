import hashlib
import json
import os

from .entities import extract_entities
from .segmenter import segment_document


def build_graph(text):
    if os.environ.get("SUMMIT_ENABLE_DOCGRAPH", "OFF") != "ON":
        return None

    segments = segment_document(text)
    entities = extract_entities(text, segments)

    # Deterministic edges: link consecutive entities in the same segment
    edges = []
    seg_entities = {}
    for ent in entities:
        seg_entities.setdefault(ent['segment_id'], []).append(ent)

    for seg_id, ents in seg_entities.items():
        ents = sorted(ents, key=lambda x: x['start'])
        for i in range(len(ents) - 1):
            edges.append({
                "source": ents[i]['id'],
                "target": ents[i+1]['id'],
                "type": "next_in_segment"
            })

    # Add hierarchical edges
    for ent in entities:
        edges.append({
            "source": ent['id'],
            "target": ent['segment_id'],
            "type": "contained_in"
        })

    docgraph = {
        "segments": segments,
        "entities": entities,
        "edges": edges
    }
    return docgraph

def save_artifacts(docgraph, run_id):
    out_dir = f"artifacts/docgraph/{run_id}"
    os.makedirs(out_dir, exist_ok=True)

    with open(f"{out_dir}/docgraph.json", "w") as f:
        json.dump(docgraph, f, indent=2)
    with open(f"{out_dir}/segments.json", "w") as f:
        json.dump(docgraph["segments"], f, indent=2)
    with open(f"{out_dir}/entities.json", "w") as f:
        json.dump(docgraph["entities"], f, indent=2)
    with open(f"{out_dir}/edges.json", "w") as f:
        json.dump(docgraph["edges"], f, indent=2)

    metrics = {
        "segment_count": len(docgraph["segments"]),
        "entity_count": len(docgraph["entities"]),
        "edge_count": len(docgraph["edges"])
    }
    with open(f"{out_dir}/metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    # deterministic stamp
    stamp_hash = hashlib.sha256(json.dumps(docgraph, sort_keys=True).encode()).hexdigest()
    with open(f"{out_dir}/stamp.json", "w") as f:
        json.dump({"hash": stamp_hash, "version": "1.0"}, f, indent=2)

if __name__ == "__main__":
    os.environ["SUMMIT_ENABLE_DOCGRAPH"] = "ON"
    docgraph = build_graph("Paragraph 1\n\nParagraph 2 with Entity Name")
    save_artifacts(docgraph, "test-run")
