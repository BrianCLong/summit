import json
import os

import jsonschema

SCHEMA_PATH = os.path.join(os.path.dirname(__file__), '../schema/event_v0.json')

with open(SCHEMA_PATH) as f:
    EVENT_SCHEMA = json.load(f)

def validate_event(event: dict) -> bool:
    try:
        jsonschema.validate(instance=event, schema=EVENT_SCHEMA)
        return True
    except jsonschema.ValidationError:
        return False
