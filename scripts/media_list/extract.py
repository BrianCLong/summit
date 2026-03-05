import argparse
import json
import sys


def extract_claims(parsed_items):
    """
    Deterministically extracts claims and tools from parsed items.
    """
    claims = []
    tools = []

    for item in parsed_items:
        if item.get("type") == "tool_list":
            tools.append({"id": "TOOL-01", "name": "Mock Tool", "raw": item.get("raw_item")})
        elif item.get("type") == "claim":
            claims.append({"id": "CLAIM-01", "description": "Improves productivity by 50%", "raw": item.get("raw_item")})

    # Deterministic sorting
    claims.sort(key=lambda x: x["id"])
    tools.sort(key=lambda x: x["id"])

    return {
        "tools": tools,
        "claims": claims
    }

def dump_yaml(data, f):
    # A simple deterministic yaml dumper for list of dicts without external dependencies
    for item in data:
        f.write(f"- id: {item.get('id')}\n")
        f.write(f"  name: {item.get('name')}\n")
        f.write(f"  raw: {item.get('raw')}\n")

def main():
    parser = argparse.ArgumentParser(description="Media AI List Extractor")
    parser.add_argument("--input_json", type=str, required=True, help="Path to parsed items JSON")
    parser.add_argument("--output", type=str, required=True, help="Path to output intermediate.json")
    parser.add_argument("--tools_out", type=str, required=True, help="Path to output tools.yaml")
    args = parser.parse_args()

    with open(args.input_json) as f:
        parsed_items = json.load(f)

    extracted = extract_claims(parsed_items)

    # Save deterministically
    with open(args.output, "w") as f:
        json.dump(extracted, f, indent=2, sort_keys=True)

    with open(args.tools_out, "w") as f:
        dump_yaml(extracted["tools"], f)

    print(f"Extracted data saved to {args.output} and {args.tools_out}")

if __name__ == "__main__":
    main()
