import csv
import re
import sys


def parse_markdown(filepath):
    with open(filepath) as f:
        lines = f.readlines()

    issues = []
    current_epic = None
    current_epic_title = None
    current_task = None

    # regex patterns
    epic_pattern = re.compile(r"^# (Epic \d+ — .+)")
    # Match any numbered list item: "1. Title" or "10. **Title**"
    task_pattern = re.compile(r"^(\d+)\.\s+(.+)$")
    outcome_pattern = re.compile(r"^\*\*Outcome:\*\* (.+)")

    for line in lines:
        line = line.strip()
        if not line:
            continue

        epic_match = epic_pattern.match(line)
        if epic_match:
            current_epic_title = epic_match.group(1)
            # Epic Labels: Extract number
            try:
                # Expected format "Epic 10 — Title"
                # split()[1] should be "10"
                epic_num = current_epic_title.split()[1]
                labels = f"Epic-{epic_num}"
            except:
                labels = "Epic"

            current_epic = {
                "Issue Type": "Epic",
                "Summary": current_epic_title,
                "Description": "",
                "Epic Link": current_epic_title,  # For Epics, we might leave this empty or use it to map
                "Labels": labels,
                "Component": "",
                "Owner": "",
                "Dependencies": "",
                "Acceptance Criteria": "",
            }
            issues.append(current_epic)
            current_task = None  # Reset task context
            continue

        if current_epic:
            outcome_match = outcome_pattern.match(line)
            if outcome_match:
                current_epic["Description"] = outcome_match.group(1)
                continue

            task_match = task_pattern.match(line)
            if task_match:
                # New task found
                title = task_match.group(2).strip()

                # Remove Markdown bolding **Title**
                if title.startswith("**") and title.endswith("**"):
                    title = title[2:-2]

                current_task = {
                    "Issue Type": "Story",
                    "Summary": title,
                    "Description": "",
                    "Epic Link": current_epic_title,
                    "Labels": current_epic["Labels"],
                    "Component": "",
                    "Owner": "",
                    "Dependencies": "",
                    "Acceptance Criteria": "",
                }
                issues.append(current_task)
                continue

            # If inside a task, parse fields
            if current_task:
                # Handle bullet points
                clean_line = line
                if clean_line.startswith("* ") or clean_line.startswith("- "):
                    clean_line = clean_line[2:]

                if clean_line.startswith("Owner:"):
                    current_task["Owner"] = clean_line.replace("Owner:", "").strip()
                elif clean_line.startswith("Deps:"):
                    current_task["Dependencies"] = clean_line.replace("Deps:", "").strip()
                elif clean_line.startswith("DoD:"):
                    current_task["Acceptance Criteria"] = clean_line.replace("DoD:", "").strip()

    return issues


def write_csv(issues, output_path):
    # Standard Jira CSV import often uses "Epic Name" for the Epic issue itself, and "Epic Link" for child issues.
    # To keep it simple based on the user's columns:
    # We will use 'Epic Link' column. For an Epic issue, this often maps to 'Epic Name' during import mapping if we want to name it.

    fieldnames = [
        "Issue Type",
        "Summary",
        "Description",
        "Epic Link",
        "Labels",
        "Component",
        "Owner",
        "Dependencies",
        "Acceptance Criteria",
    ]

    with open(output_path, "w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for issue in issues:
            writer.writerow(issue)


if __name__ == "__main__":
    input_file = "docs/sprints/EPICS_10_18_DETAILS.md"
    output_file = "docs/sprints/jira_import_epics_10_18.csv"

    try:
        issues = parse_markdown(input_file)
        write_csv(issues, output_file)
        print(f"Successfully generated {output_file} with {len(issues)} issues.")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
