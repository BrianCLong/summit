import json
import subprocess


def run(cmd, check=True):
    return subprocess.run(cmd, check=check, text=True, capture_output=True)


def repo_slug():
    out = run(
        ["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]
    ).stdout.strip()
    return out


def get_or_create_project(slug: str, name: str) -> int:
    # List projects (classic) for repo
    out = run(
        [
            "gh",
            "api",
            f"/repos/{slug}/projects",
            "-H",
            "Accept: application/vnd.github.inertia-preview+json",
        ]
    ).stdout
    projects = json.loads(out) if out.strip() else []
    for p in projects:
        if p.get("name") == name:
            return int(p["id"])  # project id
    # Create project
    out = run(
        [
            "gh",
            "api",
            "--method",
            "POST",
            f"/repos/{slug}/projects",
            "-H",
            "Accept: application/vnd.github.inertia-preview+json",
            "-f",
            f"name={name}",
            "-f",
            "body=MVP1 delivery board",
        ]
    ).stdout
    p = json.loads(out)
    return int(p["id"])


def ensure_columns(project_id: int):
    out = run(
        [
            "gh",
            "api",
            f"/projects/{project_id}/columns",
            "-H",
            "Accept: application/vnd.github.inertia-preview+json",
        ]
    ).stdout
    cols = json.loads(out) if out.strip() else []
    wanted = ["Backlog", "In Progress", "Done"]
    name_to_id = {c["name"]: int(c["id"]) for c in cols}
    for w in wanted:
        if w not in name_to_id:
            out = run(
                [
                    "gh",
                    "api",
                    "--method",
                    "POST",
                    f"/projects/{project_id}/columns",
                    "-H",
                    "Accept: application/vnd.github.inertia-preview+json",
                    "-f",
                    f"name={w}",
                ]
            ).stdout
            c = json.loads(out)
            name_to_id[w] = int(c["id"])
    return name_to_id


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
            "all",
            "--json",
            "number,title,id,htmlURL",
        ]
    ).stdout
    return json.loads(out)


def add_cards(column_id: int, issues):
    for it in issues:
        run(
            [
                "gh",
                "api",
                "--method",
                "POST",
                f"/projects/columns/{column_id}/cards",
                "-H",
                "Accept: application/vnd.github.inertia-preview+json",
                "-f",
                f"content_id={it['id']}",
                "-f",
                "content_type=Issue",
            ]
        )


def main():
    run(["gh", "auth", "status"])  # ensure authed
    slug = repo_slug()
    project_id = get_or_create_project(slug, "MVP1 Delivery")
    cols = ensure_columns(project_id)
    issues = list_mvp1_issues(slug)
    add_cards(cols["Backlog"], issues)
    print(f"Added {len(issues)} issues to project board 'MVP1 Delivery' → Backlog")


if __name__ == "__main__":
    main()
