import re
import json

path = "evidence/index.json"
with open(path, "r") as f:
    content = f.read()

# Fix pattern: { "evidence_id": "ID", ... } -> "ID": { "evidence_id": "ID", ... }
# Note: The file seems to have objects inside 'items' that lack keys.
# We assume they have 'evidence_id' property.

def replacer(match):
    # match.group(0) is the full object block
    # We need to extract evidence_id.
    # But regex replace on multiline block is hard.
    # Let's simple string replace:
    # replace '{ "evidence_id": "ID"' with '"ID": { "evidence_id": "ID"'
    # But we need to handle whitespace.
    return match.group(0)

# Better approach: Read line by line or use regex on the whole string to fix the start of the object.
# Look for: , \s* { \s* "evidence_id": "([^"]+)"
# Replace with: , \n "": { "evidence_id": ""

fixed = re.sub(r'(\s*)\{\s*"evidence_id":\s*"([^"]+)"', r'\1"\2": { "evidence_id": "\2"', content)

# Check if it parses
try:
    data = json.loads(fixed)
    print("Fixed JSON parses successfully.")
except json.JSONDecodeError as e:
    print(f"JSON Parse Error after fix: {e}")
    # Manual fallback for the specific lines we saw
    # Maybe the file is messed up in other ways.
    # Let's just try to overwrite the file with the fixed content if it looks better.

with open(path, "w") as f:
    f.write(fixed)
