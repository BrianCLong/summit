#!/usr/bin/env python3
import argparse
import json
import os
import re
from typing import Dict, List, Tuple

FRONTMATTER_RE = re.compile(r"^---\s*$")
NAME_RE = re.compile(r"^name:\s*(.+)\s*$")
DESC_RE = re.compile(r"^description:\s*(.+)\s*$")


def parse_skill_frontmatter(path: str) -> Tuple[str, str]:
    """Parse name/description from SKILL.md frontmatter."""
    name = ""
    description = ""
    in_frontmatter = False
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if FRONTMATTER_RE.match(line):
                if not in_frontmatter:
                    in_frontmatter = True
                    continue
                break
            if not in_frontmatter:
                continue
            name_match = NAME_RE.match(line)
            if name_match:
                name = name_match.group(1).strip().strip('"')
                continue
            desc_match = DESC_RE.match(line)
            if desc_match:
                description = desc_match.group(1).strip().strip('"')
                continue
    return name, description


def find_skills(roots: List[str]) -> List[Dict[str, str]]:
    skills: List[Dict[str, str]] = []
    seen: set = set()
    for root in roots:
        for dirpath, _dirnames, filenames in os.walk(root):
            if "SKILL.md" not in filenames:
                continue
            skill_path = os.path.join(dirpath, "SKILL.md")
            name, description = parse_skill_frontmatter(skill_path)
            if not name:
                name = os.path.basename(os.path.dirname(skill_path))
            key = (name, skill_path)
            if key in seen:
                continue
            seen.add(key)
            skills.append({
                "name": name,
                "description": description,
                "path": skill_path,
            })
    skills.sort(key=lambda s: s["name"].lower())
    return skills


def format_markdown(skills: List[Dict[str, str]]) -> str:
    lines = ["Capability Map", ""]
    for skill in skills:
        desc = skill["description"] or "(no description)"
        lines.append(f"- `{skill['name']}`: {desc}")
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a capability map from skill roots.")
    parser.add_argument("roots", nargs="+", help="Skill root directories to scan")
    parser.add_argument("--json", action="store_true", help="Emit JSON output")
    args = parser.parse_args()

    skills = find_skills(args.roots)
    if args.json:
        print(json.dumps(skills, indent=2, sort_keys=True))
        return
    print(format_markdown(skills))


if __name__ == "__main__":
    main()
