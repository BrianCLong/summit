import argparse
import hashlib
import json


def generate_evidence_id(slug, claim_idx):
    return f"MEDIA-{slug}-CLAIM-{claim_idx:03d}"

def map_to_evidence_schema(extracted_data, slug):
    evidence_items = []

    for i, claim in enumerate(extracted_data.get("claims", []), start=1):
        ev_id = generate_evidence_id(slug, i)

        evidence_item = {
            "id": ev_id,
            "type": "claim",
            "source": f"media_ai_list/{slug}",
            "raw": claim.get("raw"),
            "description": claim.get("description"),
            "tool_ref": extracted_data.get("tools", [{}])[0].get("id", "UNKNOWN") if extracted_data.get("tools") else None,
            "determinism_hash": hashlib.sha256(claim.get("raw", "").encode()).hexdigest()
        }
        evidence_items.append(evidence_item)

    return evidence_items

def main():
    parser = argparse.ArgumentParser(description="Map Extracted Claims to Evidence Schema")
    parser.add_argument("--input", type=str, required=True, help="Path to intermediate.json")
    parser.add_argument("--output", type=str, required=True, help="Path to output evidence.json")
    parser.add_argument("--slug", type=str, required=True, help="Media list slug")
    args = parser.parse_args()

    with open(args.input) as f:
        extracted = json.load(f)

    evidence_items = map_to_evidence_schema(extracted, args.slug)

    with open(args.output, "w") as f:
        json.dump(evidence_items, f, indent=2, sort_keys=True)

    print(f"Evidence saved to {args.output}")

if __name__ == "__main__":
    main()
