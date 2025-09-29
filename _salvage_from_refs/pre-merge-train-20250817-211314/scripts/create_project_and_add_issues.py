import json
import subprocess
import sys


def run(cmd, check=True):
    return subprocess.run(cmd, check=check, text=True, capture_output=True)


def repo_slug():
    out = run(["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]).stdout.strip()
    return out


def repo_owner(slug: str) -> str:
    return slug.split("/", 1)[0]


def ensure_project(owner: str, title: str) -> int:
    # Try to view project by title
    try:
        out = run(["gh", "project", "view", title, "--owner", owner, "--format", "json"]).stdout
        p = json.loads(out)
        if p and "number" in p:
            return int(p["number"])
    except subprocess.CalledProcessError:
        pass
    # Try to create project (may fail if disabled)
    try:
        run(["gh", "project", "create", "--owner", owner, "--title", title])
        out = run(["gh", "project", "view", title, "--owner", owner, "--format", "json"]).stdout
        p = json.loads(out)
        if p and "number" in p:
            return int(p["number"])
    except subprocess.CalledProcessError as e:
        raise SystemExit("Projects (v2) may be disabled for your account/org. Please create a project named 'MVP1 Delivery' in the UI and re-run this script.")


def list_mvp1_issues(slug: str):
    out = run([
        "gh", "issue", "list", "--repo", slug, "--label", "mvp1",
        "--state", "open", "--json", "number,title,url,labels"
    ]).stdout
    return json.loads(out)


def add_to_project(owner: str, project_number: int, issue_url: str):
    run([
        "gh", "project", "item-add", "--owner", owner,
        "--project-number", str(project_number), "--url", issue_url
    ])


def main():
    # Ensure auth
    run(["gh", "auth", "status"])
    slug = repo_slug()
    owner = repo_owner(slug)
    project_title = "MVP1 Delivery"
    try:
        number = ensure_project(owner, project_title)
        print(f"Project: {owner} #{number} — {project_title}")
        issues = list_mvp1_issues(slug)
        for it in issues:
            print(f"Adding: #{it['number']} {it['title']}")
            add_to_project(owner, number, it["url"])
        print(f"Added {len(issues)} items to project {number}.")
    except SystemExit as e:
        print(str(e))
        print("As a fallback, create a classic board or v2 project in the UI, then re-run this script to auto-add items.")


if __name__ == "__main__":
    main()
