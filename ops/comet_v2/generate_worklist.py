import re
import json
import os
import sys

# Constants
TRACKING_ISSUE_PATH = os.path.join(os.path.dirname(__file__), 'tracking_issue.md')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), 'worklist.json')

def parse_issue(content):
    worklist = []

    # Regex for checkbox items: "- [ ] Description"
    item_regex = re.compile(r'^\s*-\s*\[([ xX])\]\s*(.+)$')
    # Regex for PR number
    pr_regex = re.compile(r'PR\s*#?(\d+)', re.IGNORECASE)

    lines = content.splitlines()
    current_item = None

    for i, line in enumerate(lines):
        match = item_regex.match(line)
        if match:
            if current_item:
                worklist.append(process_item(current_item, pr_regex))

            status_char = match.group(1).lower()
            description = match.group(2).strip()
            current_item = {
                "description": description,
                "status_char": status_char,
                "context": []
            }
        elif current_item:
            if line.strip() and not line.strip().startswith('- ['):
                 current_item["context"].append(line.strip())
            elif line.strip().startswith('- ['):
                pass

    if current_item:
        worklist.append(process_item(current_item, pr_regex))

    return worklist

def process_item(item, pr_regex):
    description = item["description"]
    status_char = item["status_char"]
    context = " ".join(item["context"]).lower()
    full_text = (description + " " + context).lower()

    score = 1 # Ready for implementation
    status_text = "Ready for Implementation"

    if status_char == 'x':
        score = 3 # Completed
        status_text = "Completed"
    elif "blocked" in full_text:
        score = 0
        status_text = "Blocked"
    elif "pr #" in full_text or "pr open" in full_text or "ready for review" in full_text:
        score = 2
        status_text = "Ready for Review"

    # Extract PR number
    pr_number = None
    pr_match = pr_regex.search(description + " " + " ".join(item["context"]))
    if pr_match:
        pr_number = int(pr_match.group(1))

    return {
        "description": description,
        "score": score,
        "status_text": status_text,
        "pr_number": pr_number
    }

def main():
    if not os.path.exists(TRACKING_ISSUE_PATH):
        print(f"Error: {TRACKING_ISSUE_PATH} not found.")
        sys.exit(1)

    with open(TRACKING_ISSUE_PATH, 'r') as f:
        content = f.read()

    worklist = parse_issue(content)

    with open(OUTPUT_PATH, 'w') as f:
        json.dump(worklist, f, indent=2)

    print(f"Generated worklist with {len(worklist)} items at {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
