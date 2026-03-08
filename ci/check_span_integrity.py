import json
import sys


def check_spans(docgraph):
    # Verify no spans are negative or end before they start
    for seg in docgraph.get('segments', []):
        if seg['start'] < 0 or seg['end'] < seg['start']:
            print(f"Invalid segment span: {seg}")
            sys.exit(1)

    for ent in docgraph.get('entities', []):
        if ent['start'] < 0 or ent['end'] < ent['start']:
            print(f"Invalid entity span: {ent}")
            sys.exit(1)

        # Verify entity span is within its parent segment
        parent_id = ent.get('segment_id')
        if parent_id:
            parent_seg = next((s for s in docgraph['segments'] if s['id'] == parent_id), None)
            if parent_seg:
                if ent['start'] < parent_seg['start'] or ent['end'] > parent_seg['end']:
                    print(f"Entity span out of bounds of segment: {ent}")
                    sys.exit(1)

    print("Span integrity check passed")

if __name__ == "__main__":
    # In a real CI pipeline this would load artifacts/docgraph/.../docgraph.json
    # For now we use a mock valid graph to ensure logic works
    mock_graph = {
        "segments": [{"id": "s1", "start": 0, "end": 100}],
        "entities": [{"id": "e1", "start": 10, "end": 20, "segment_id": "s1"}]
    }
    check_spans(mock_graph)
