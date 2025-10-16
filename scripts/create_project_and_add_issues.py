import json
import subprocess
from pathlib import Path


def run(cmd, check=True):
    return subprocess.run(cmd, check=check, text=True, capture_output=True)


def repo_slug():
    out = run(
        ["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]
    ).stdout.strip()
    return out


def repo_owner(slug: str) -> str:
    return slug.split("/", 1)[0]


def load_priorities() -> dict:
    path = Path("analytics/roadmap_signals.json")
    if path.exists():
        try:
            data = json.loads(path.read_text())
            return {
                item["title"]: item.get("priority")
                for item in data.get("top_needs", [])
                if item.get("priority")
            }
        except json.JSONDecodeError:
            pass
    return {}


def ensure_project(owner: str, title: str) -> tuple[int, str]:
    # Try to view project by title
    try:
        out = run(
            [
                "gh",
                "project",
                "view",
                title,
                "--owner",
                owner,
                "--format",
                "json",
            ]
        ).stdout
        p = json.loads(out)
        if p and "number" in p and "id" in p:
            return int(p["number"]), p["id"]
    except subprocess.CalledProcessError:
        pass
    # Try to create project (may fail if disabled)
    try:
        run(["gh", "project", "create", "--owner", owner, "--title", title])
        out = run(
            [
                "gh",
                "project",
                "view",
                title,
                "--owner",
                owner,
                "--format",
                "json",
            ]
        ).stdout
        p = json.loads(out)
        if p and "number" in p and "id" in p:
            return int(p["number"]), p["id"]
    except subprocess.CalledProcessError:
        raise SystemExit(
            "Projects (v2) may be disabled for your account/org. Please create a project named 'MVP1 Delivery' in the UI and re-run this script."
        )


def get_priority_field(owner: str, project_number: int) -> tuple[str | None, dict]:
    try:
        out = run(
            [
                "gh",
                "project",
                "field-list",
                str(project_number),
                "--owner",
                owner,
                "--format",
                "json",
            ]
        ).stdout
        fields = json.loads(out)
        for f in fields:
            if f.get("name", "").lower() == "priority":
                options = {opt["name"]: opt["id"] for opt in f.get("options", [])}
                return f.get("id"), options
    except subprocess.CalledProcessError:
        pass
    return None, {}


def set_priority(owner: str, project_id: str, item_id: str, field_id: str, option_id: str):
    run(
        [
            "gh",
            "project",
            "item-edit",
            "--id",
            item_id,
            "--project-id",
            project_id,
            "--field-id",
            field_id,
            "--single-select-option-id",
            option_id,
        ]
    )


def list_mvp1_issues(slug: str):
    out = run(
        [
            "gh",
            "issue",
            "list",
            "--repo",
            slug,
            "--label",
            "mvp1",
            "--state",
            "open",
            "--json",
            "number,title,url,labels",
        ]
    ).stdout
    return json.loads(out)


def add_to_project(owner: str, project_number: int, issue_url: str) -> str | None:
    out = run(
        [
            "gh",
            "project",
            "item-add",
            "--owner",
            owner,
            "--project-number",
            str(project_number),
            "--url",
            issue_url,
            "--format",
            "json",
        ]
    ).stdout
    try:
        return json.loads(out).get("id")
    except json.JSONDecodeError:
        return None


def main():
    # Ensure auth
    run(["gh", "auth", "status"])
    slug = repo_slug()
    owner = repo_owner(slug)
    project_title = "MVP1 Delivery"
    try:
        number, project_id = ensure_project(owner, project_title)
        print(f"Project: {owner} #{number} — {project_title}")
        priorities = load_priorities()
        field_id, options = get_priority_field(owner, number)
        issues = list_mvp1_issues(slug)
        for it in issues:
            print(f"Adding: #{it['number']} {it['title']}")
            item_id = add_to_project(owner, number, it["url"])
            priority = priorities.get(it["title"])
            if item_id and priority and field_id and priority in options:
                set_priority(owner, project_id, item_id, field_id, options[priority])
        print(f"Added {len(issues)} items to project {number}.")
    except SystemExit as e:
        print(str(e))
        print(
            "As a fallback, create a classic board or v2 project in the UI, then re-run this script to auto-add items."
        )


if __name__ == "__main__":
    main()
