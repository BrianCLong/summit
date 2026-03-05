from __future__ import annotations


def run(args: dict) -> dict:
    fields = args.get("required_fields", [])
    return {
        "required_fields": sorted(fields),
        "status": "pending_investigator_input",
    }
