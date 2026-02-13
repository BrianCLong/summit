from pathlib import Path
import json
import sys

INDEX = Path("evidence/index.json")
if not INDEX.exists():
    print("Missing evidence/index.json")
    sys.exit(1)

def load_index():
    try:
        data = json.loads(INDEX.read_text(encoding="utf-8"))
        items = []
        # Support both 'items' and 'evidence' top-level keys
        container = data.get("items") or data.get("evidence")
        if container is None:
            print("index.json must contain 'items' or 'evidence' field")
            sys.exit(1)

        if isinstance(container, list):
            items = container
        elif isinstance(container, dict):
            for ev_id, entry in container.items():
                if isinstance(entry, dict):
                    item = entry.copy()
                    item["evidence_id"] = ev_id
                    items.append(item)
                else:
                    # Handle cases where entry might just be a list of files
                    items.append({"evidence_id": ev_id, "files": entry})
        else:
            print(f"Unsupported container type: {type(container)}")
            sys.exit(1)

        return items
    except Exception as e:
        print(f"Error loading index.json: {e}")
        sys.exit(1)

# Determinism guard: ensure stamp.json is the only allowed timestamp carrier
FORBIDDEN_KEYS = {"timestamp", "time", "datetime"}

def contains_forbidden_keys(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in FORBIDDEN_KEYS:
                return True
            if contains_forbidden_keys(v):
                return True
    if isinstance(obj, list):
        return any(contains_forbidden_keys(x) for x in obj)
    return False

# Focus on ai-assist evidence for this specific validator
AI_ASSIST_PREFIX = "EVD-ai-coding-tools-senior"

def main():
    items = load_index()
    found_ai_assist = False

    for item in items:
        ev_id = item.get("evidence_id")
        if not ev_id or not ev_id.startswith(AI_ASSIST_PREFIX):
            continue

        found_ai_assist = True
        # Support 'files', 'artifacts', 'paths', or individual keys
        files = item.get("files") or item.get("artifacts") or item.get("paths")
        if not files:
            # Check for individual keys
            files = [item.get(k) for k in ("report", "metrics", "stamp") if item.get(k)]

        if not files or not isinstance(files, list):
            print(f"{ev_id}: missing or invalid files list")
            sys.exit(1)

        for file_path in files:
            p = Path(file_path)
            if not p.exists():
                print(f"{ev_id}: missing file {p}")
                sys.exit(1)

            if "stamp.json" not in p.name:
                try:
                    data = json.loads(p.read_text(encoding="utf-8"))
                    if contains_forbidden_keys(data):
                        print(f"{ev_id}: forbidden time-like keys in {p} (use stamp.json only)")
                        sys.exit(1)
                except json.JSONDecodeError:
                    print(f"{ev_id}: {p} is not valid JSON")
                    sys.exit(1)

    if not found_ai_assist:
        print("Warning: No AI-assist evidence found in index.")
    else:
        print("OK: AI-assist evidence index and files validated.")

if __name__ == "__main__":
    main()
