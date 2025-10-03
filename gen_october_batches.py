import os
import json

NUM_BATCH_FILES = 5
NUM_ISSUES_PER_BATCH = 3
BASE_FILENAME = "batch_{:03d}.json"
OUTPUT_DIR = "project_management/october2025_issue_json"

os.makedirs(OUTPUT_DIR, exist_ok=True)

for batch_num in range(1, NUM_BATCH_FILES + 1):
    entries = []
    for issue_num in range(1, NUM_ISSUES_PER_BATCH + 1):
        entries.append({
            "title": f"IG Oct25 | Workstream {batch_num}-{issue_num}",
            "body": f"Automated issue for batch {batch_num}, issue {issue_num} — checkpoint, notes, and actions.",
            "labels": ["oct25", "autogen", "test"]
        })
    batch = {"entries": entries}
    with open(os.path.join(OUTPUT_DIR, BASE_FILENAME.format(batch_num)), "w") as f:
        json.dump(batch, f, indent=2)
