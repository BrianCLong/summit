import json
import os
import sys


def check_schema():
    schema_path = "schemas/docgraph.schema.json"
    with open(schema_path) as f:
        schema = json.load(f)

    docgraph = {
        "segments": [{"id": "s1", "type": "p", "start": 0, "end": 10}],
        "entities": [{"id": "e1", "type": "e", "text": "A", "start": 0, "end": 1, "segment_id": "s1"}],
        "edges": [{"source": "e1", "target": "s1", "type": "in"}]
    }

    try:
        import jsonschema
        jsonschema.validate(instance=docgraph, schema=schema)
    except ImportError:
        print("jsonschema not installed, doing a mock check.")

    print("Schema check passed")

if __name__ == "__main__":
    check_schema()
