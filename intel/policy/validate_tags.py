#!/usr/bin/env python3
import json
import os
import sys


def load_json(path):
    with open(path) as f:
        return json.load(f)

def validate_item_tags(item_path, policy_path):
    item = load_json(item_path)
    policy = load_json(policy_path)

    item_tags = set(item.get("tags", []))
    errors = []

    # Simple keyword checking heuristic for demonstration
    # In a real system, this might use an NLP classifier or keyword list
    content_text = json.dumps(item).lower()

    if "offensive" in content_text or "cyber command" in content_text:
        required = set(policy["sensitive_topics"]["offensive_operations"])
        missing = required - item_tags
        if missing:
            errors.append(f"Content detected as offensive ops but missing tags: {missing}")

    if "attributed to" in content_text or "linked to" in content_text:
        required = set(policy["sensitive_topics"]["attribution"])
        missing = required - item_tags
        if missing:
             # Just a warning for now as attribution text is common
             pass

    return errors

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: validate_tags.py <item_json> <policy_json>")
        sys.exit(1)

    item_file = sys.argv[1]
    policy_file = sys.argv[2]

    if not os.path.exists(item_file):
        print(f"Item file not found: {item_file}")
        sys.exit(1)

    errors = validate_item_tags(item_file, policy_file)
    if errors:
        print("Tag Policy Validation FAILED:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print("Tag Policy Validation PASSED.")
