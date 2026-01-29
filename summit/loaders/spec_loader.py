import json
import os
from typing import Dict, Any, Optional

class SpecLoader:
    def __init__(self, specs_dir: Optional[str] = None):
        if specs_dir is None:
            # Default to summit/specs relative to this file
            current_dir = os.path.dirname(os.path.abspath(__file__))
            specs_dir = os.path.join(current_dir, "..", "specs")

        self.specs_dir = specs_dir
        self.schemas: Dict[str, Any] = {}
        if os.path.exists(self.specs_dir):
            self._load_schemas()

    def _load_schemas(self):
        for filename in os.listdir(self.specs_dir):
            if filename.endswith(".jsonschema"):
                # e.g. mode_spec.jsonschema -> mode_spec
                name = filename.replace(".jsonschema", "")
                with open(os.path.join(self.specs_dir, filename), "r") as f:
                    try:
                        self.schemas[name] = json.load(f)
                    except json.JSONDecodeError:
                        print(f"Warning: Failed to parse schema {filename}")

    def get_schema(self, spec_type: str) -> Dict[str, Any]:
        """
        Get a loaded schema by type (e.g. 'mode_spec').
        """
        return self.schemas.get(spec_type, {})
