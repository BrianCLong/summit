import json
import os
import jsonschema

# Path to summit/evidence
BASE_DIR = os.path.join(os.path.dirname(__file__), '../summit/evidence')

def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)

def test_evidence_schemas():
    # Load index
    index_path = os.path.join(BASE_DIR, 'index.json')
    index = load_json(index_path)

    # Load schemas
    schemas_dir = os.path.join(BASE_DIR, 'schemas')
    report_schema = load_json(os.path.join(schemas_dir, 'report.schema.json'))
    metrics_schema = load_json(os.path.join(schemas_dir, 'metrics.schema.json'))
    stamp_schema = load_json(os.path.join(schemas_dir, 'stamp.schema.json'))

    for item in index['items']:
        evidence_id = item['evidence_id']
        print(f"Validating {evidence_id}")

        # Paths are relative to index.json location (summit/evidence/)
        report_path = os.path.join(BASE_DIR, item['report'])
        metrics_path = os.path.join(BASE_DIR, item['metrics'])
        stamp_path = os.path.join(BASE_DIR, item['stamp'])

        report = load_json(report_path)
        metrics = load_json(metrics_path)
        stamp = load_json(stamp_path)

        # Validate
        jsonschema.validate(instance=report, schema=report_schema)
        jsonschema.validate(instance=metrics, schema=metrics_schema)
        jsonschema.validate(instance=stamp, schema=stamp_schema)

if __name__ == "__main__":
    test_evidence_schemas()
