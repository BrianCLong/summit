import yaml
import json
import os
import sys

def load_source(filepath):
    with open(filepath, 'r') as f:
        return yaml.safe_load(f)

def ingest(filepath):
    data = load_source(filepath)
    source = data.get('source', {})
    tools = data.get('tools', [])

    if source.get('retrieval_status') != 'verified':
        print(f"ERROR: Source {filepath} is unverified. Deny-by-default applied.", file=sys.stderr)
        sys.exit(1)

    if len(tools) != 7:
        print(f"ERROR: Expected exactly 7 tools in {filepath}, found {len(tools)}.", file=sys.stderr)
        sys.exit(1)

    # Process tools
    result = []
    for tool in tools:
        entry = {
            "name": tool["name"],
            "function": tool["function"],
            "description": tool["description"],
            "claims": sorted(tool.get("claims", []))
        }
        result.append(entry)

    # Sort for determinism
    result = sorted(result, key=lambda x: x["name"])
    return result

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 ingest.py <path_to_yaml>", file=sys.stderr)
        sys.exit(1)
    filepath = sys.argv[1]
    result = ingest(filepath)
    print(json.dumps(result, indent=2))
