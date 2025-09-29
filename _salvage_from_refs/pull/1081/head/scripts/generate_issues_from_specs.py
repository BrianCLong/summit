import csv
import re
from pathlib import Path

SPECS_DIR = Path("docs/mvp1")
MAPPING_FILE = SPECS_DIR / "MVP1_Epics_and_Milestones.md"
OUTPUT_DIR = Path("project_management")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
ISSUES_CSV = OUTPUT_DIR / "issues_mvp1.csv"
EPICS_MD_DIR = OUTPUT_DIR / "epics"
EPICS_MD_DIR.mkdir(parents=True, exist_ok=True)


def parse_mapping(mapping_path: Path):
    text = mapping_path.read_text(encoding="utf-8")
    epics = []
    current_epic = None
    for line in text.splitlines():
        if line.startswith("## Epic "):
            # close previous
            if current_epic:
                epics.append(current_epic)
            # extract name after dash
            name = line.split("–", 1)[-1].strip() if "–" in line else line.replace("##", "").strip()
            current_epic = {"name": name, "milestone": None, "issues": []}
        elif line.startswith("**Milestone:**") and current_epic is not None:
            current_epic["milestone"] = line.split("**Milestone:**", 1)[1].strip()
        elif line.startswith("- ") and current_epic is not None:
            current_epic["issues"].append(line[2:].strip())
    if current_epic:
        epics.append(current_epic)

    # Build quick lookup maps
    title_to_milestone = {}
    title_to_epic = {}
    for epic in epics:
        for t in epic["issues"]:
            title_to_milestone[t] = epic["milestone"]
            title_to_epic[t] = epic["name"]
    return epics, title_to_milestone, title_to_epic


def parse_spec(spec_path: Path):
    text = spec_path.read_text(encoding="utf-8")
    lines = text.splitlines()
    title = next((l[2:].strip() for l in lines if l.startswith("# ")), spec_path.stem)

    def section(header):
        start = None
        for i, l in enumerate(lines):
            if l.strip() == f"## {header}":
                start = i + 1
                break
        if start is None:
            return ""
        # collect until next heading or delimiter
        collected = []
        for l in lines[start:]:
            if re.match(r"^## ", l) or l.strip() == "---":
                break
            collected.append(l)
        # strip trailing blank lines
        while collected and collected[-1].strip() == "":
            collected.pop()
        return "\n".join(collected).strip()

    description = section("Description")
    labels_raw = section("Labels").replace(",", " ")
    labels = [s.strip() for s in labels_raw.split() if s.strip()] if labels_raw else []
    priority_text = section("Priority")
    # Normalize priority label to priority:P0/P1/P2
    prio_match = re.search(r"(P[0-3])", priority_text)
    if prio_match:
        labels.append(f"priority:{prio_match.group(1)}")

    acceptance = section("Acceptance Criteria")
    return {
        "title": title,
        "description": description,
        "labels": labels,
        "acceptance": acceptance,
        "priority": priority_text,
        "filename": spec_path.name,
    }


def build_issue_body(spec):
    parts = []
    if spec["description"]:
        parts.append(f"### Description\n{spec['description']}")
    if spec["acceptance"]:
        parts.append(f"### Acceptance Criteria\n{spec['acceptance']}")
    parts.append(f"\nSpec: docs/mvp1/{spec['filename']}")
    return "\n\n".join(parts).strip()


def main():
    epics, title_to_milestone, title_to_epic = parse_mapping(MAPPING_FILE)

    specs = []
    for p in SPECS_DIR.glob("*.md"):
        if p.name in {"README.md", MAPPING_FILE.name}:
            continue
        specs.append(parse_spec(p))

    # Write issues CSV
    with ISSUES_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["Title", "Body", "Labels", "Milestone"],
        )
        writer.writeheader()

        # Feature/issues from specs
        for spec in specs:
            labels = sorted(set(spec["labels"] + ["mvp1"]))
            title = spec["title"]
            milestone = title_to_milestone.get(title, "")
            body = build_issue_body(spec)
            writer.writerow(
                {
                    "Title": title,
                    "Body": body,
                    "Labels": ", ".join(labels),
                    "Milestone": milestone,
                }
            )

        # Epic issues as checklist containers
        for epic in epics:
            checklist = "\n".join(f"- [ ] {t}" for t in epic["issues"]) if epic["issues"] else ""
            body = (
                f"### Epic\n{epic['name']}\n\n"
                f"### Milestone\n{epic['milestone']}\n\n"
                f"### Child Issues\n{checklist}\n"
            )
            writer.writerow(
                {
                    "Title": f"Epic: {epic['name']}",
                    "Body": body.strip(),
                    "Labels": ", ".join(["epic", "mvp1"]),
                    "Milestone": epic["milestone"],
                }
            )

    # Also drop individual epic markdown files for human review
    for epic in epics:
        md = [
            f"# Epic: {epic['name']}",
            "",
            f"Milestone: {epic['milestone']}",
            "",
            "## Child Issues",
        ]
        md.extend(f"- [ ] {t}" for t in epic["issues"])
        (EPICS_MD_DIR / f"{epic['name'].replace(' ', '_')}.md").write_text(
            "\n".join(md) + "\n", encoding="utf-8"
        )

    print(f"Wrote {ISSUES_CSV} and epic markdown in {EPICS_MD_DIR}")


if __name__ == "__main__":
    main()
