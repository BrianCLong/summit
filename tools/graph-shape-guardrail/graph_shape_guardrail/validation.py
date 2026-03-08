import json

import jsonschema


def validate_artifact(data, schema_path):
    """
    Validates a dictionary against a JSON schema file.
    Raises jsonschema.exceptions.ValidationError if invalid.
    """
    with open(schema_path) as f:
        schema = json.load(f)
    jsonschema.validate(instance=data, schema=schema)
