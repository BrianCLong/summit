import json

with open("evidence/schemas/report.schema.json") as f:
    schema = json.load(f)

# Handle cases where report is a list!
schema = {
    "anyOf": [
        schema,
        {
            "type": "array",
            "items": {}
        }
    ]
}

with open("evidence/schemas/report.schema.json", "w") as f:
    json.dump(schema, f, indent=2)
