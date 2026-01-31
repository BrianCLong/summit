import datetime
import json
import os
from typing import Any, Dict, List

import jsonschema

SCHEMA_DIR = os.path.join(os.path.dirname(__file__), "schemas")

def load_schema(name: str) -> dict[str, Any]:
    with open(os.path.join(SCHEMA_DIR, f"{name}.schema.json")) as f:
        return json.load(f)

def validate_data(data: dict[str, Any], schema_name: str):
    schema = load_schema(schema_name)
    jsonschema.validate(instance=data, schema=schema)

class EvidenceWriter:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def write_report(self, data: dict[str, Any]):
        validate_data(data, "report")
        self._write("report.json", data)

    def write_metrics(self, data: dict[str, Any]):
        validate_data(data, "metrics")
        self._write("metrics.json", data)

    def write_stamp(self):
        # Use timezone-aware UTC
        data = {"created_at": datetime.datetime.now(datetime.UTC).isoformat().replace("+00:00", "Z")}
        validate_data(data, "stamp")
        self._write("stamp.json", data)

    def write_index(self, data: dict[str, list[str]]):
        validate_data(data, "index")
        self._write("index.json", data)

    def _write(self, filename: str, data: dict[str, Any]):
        with open(os.path.join(self.output_dir, filename), "w") as f:
            json.dump(data, f, indent=2)
