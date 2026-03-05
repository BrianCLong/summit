import json

with open("evidence/index.json") as f:
    data = json.load(f)

# Convert dictionary items to list format matching schema
# Schema requires: id, path
# Current index.json has keys as IDs, and values as objects with 'files' or 'artifacts'
# This implies the index.json I saw earlier was a MIX of formats, or the schema expects something else.
# The schema says "items" should be an array of objects with "id" and "path".
# But evidence/index.json has "items" as a dictionary.

# I need to convert "items" to a list.
# For each key (evidence_id) in the dict:
#   id = key
#   path = ?
#   The values have 'files' or 'artifacts'.
#   The existing validator script logic:
#     for item in index_data.get("items", []):
#         evidence_id = item.get("id")
#         path = item.get("path")
#
#   Wait, the validator script ALREADY expects a list (it iterates over it).
#   But I converted it to a dict in `fix_evidence_json.py` because I thought the original format was broken dict-like?
#   The original file had mixed items?
#   Let's look at what I read earlier:
#   It had keys like "EVD-..." mapped to objects. And then some objects inside the items list?
#
#   Let's revert to the structure the schema expects: a list of objects.
#   I will map the dictionary I created back to a list.
#   But what should be the 'path'?
#   Most entries in my dict have "files": ["evidence/report.json", ...]
#   The schema expects a single "path".
#   This suggests the "path" points to a DIRECTORY containing the artifacts?
#   Or maybe the file itself if it's a single artifact?
#
#   My new items:
#   "EVD-kg-scaling-sharding-partitioning-milvus-router-001": { "files": ["evidence/report.json", ...] }
#   These point to the generic evidence/ directory.
#   So path should be "evidence/"?
#
#   Let's see existing items in index.json (before I messed it up, or from what I can infer).
#   The original read showed:
#     "EVD-PIPELINE-RESILIENCE-001": { ... "artifacts": [...] }
#     AND
#     { "evidence_id": "...", "files": [...] }
#
#   It seems `evidence/index.json` was indeed a mess of mixed types.
#   BUT `evidence/schemas/index.schema.json` is strict: items is an array.
#
#   So I must convert the entire `items` dictionary to a list of objects adhering to the schema.
#   But wait, the schema only allows `id` and `path`.
#   It does NOT allow `files` or `artifacts` list.
#   This implies that for each evidence ID, there is ONE path.
#   And likely that path is a directory containing the standard bundle (report, metrics, stamp).
#
#   However, my new evidence points to "evidence/" which contains the artifacts directly.
#   So for my new items, path="evidence/".
#
#   What about the others?
#   "EVD-PIPELINE-RESILIENCE-001" had artifacts ["evidence/report.json", ...]. This also points to "evidence/" dir.
#   "EVD-SSDF12-BNDL-001" had "evidence/ssdf-v1-2/pr-01/report.json". So path="evidence/ssdf-v1-2/pr-01/".
#
#   So I need to infer the directory from the file list and set it as `path`.
#   And I need to drop `files` / `artifacts` / `title` / `category` to comply with `additionalProperties: false`.

new_items = []

for key, value in data["items"].items():
    # Key is ID.
    # Value is dict.

    # Check for files/artifacts
    files = value.get("files") or value.get("artifacts")

    path = ""
    if files and isinstance(files, list) and len(files) > 0:
        # Take the directory of the first file
        # Check if it's just a file path string or what
        first_file = files[0]
        if "/" in first_file:
            path = first_file.rsplit("/", 1)[0]
        else:
            path = "."
    elif "path" in value:
        path = value["path"]

    # Special handling for ambiguous ones or if path is empty
    if not path:
        # Fallback?
        print(f"Warning: Could not determine path for {key}")
        continue

    new_item = {
        "id": key,
        "path": path
    }
    new_items.append(new_item)

data["items"] = new_items

with open("evidence/index.json", "w") as f:
    json.dump(data, f, indent=2)

print("Converted index.json to schema-compliant list format.")
