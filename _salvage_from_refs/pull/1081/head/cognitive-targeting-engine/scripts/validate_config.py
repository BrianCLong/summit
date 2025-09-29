import json
import sys

from jsonschema import ValidationError, validate

CONFIG_FILE = "cognitive-targeting-engine/config.json"
SCHEMA_FILE = "cognitive-targeting-engine/config.schema.json"


def validate_config():
    try:
        with open(CONFIG_FILE) as f:
            config_data = json.load(f)
        with open(SCHEMA_FILE) as f:
            schema_data = json.load(f)

        validate(instance=config_data, schema=schema_data)
        print(f"Validation successful: {CONFIG_FILE} is valid against {SCHEMA_FILE}")
        return True
    except FileNotFoundError:
        print(
            f"Error: One or both files not found. Make sure {CONFIG_FILE} and {SCHEMA_FILE} exist."
        )
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {CONFIG_FILE} or {SCHEMA_FILE}: {e}")
        sys.exit(1)
    except ValidationError as e:
        print(f"Validation failed for {CONFIG_FILE}:")
        print(e.message)
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred during validation: {e}")
        sys.exit(1)


if __name__ == "__main__":
    validate_config()
