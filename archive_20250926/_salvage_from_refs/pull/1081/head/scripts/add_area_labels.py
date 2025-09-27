import json
import subprocess


def run(cmd, check=True):
    return subprocess.run(cmd, check=check, text=True, capture_output=True)


def repo_slug():
    out = run(
        ["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]
    ).stdout.strip()
    return out


AREA_BY_MILESTONE = {
    "MVP1-Core-Graph": "area:core-graph",
    "MVP1-Copilot": "area:copilot",
    "MVP1-Federation": "area:federation",
    "MVP1-Simulation": "area:simulation",
    "MVP1-Collaboration": "area:collaboration",
    "MVP1-Predictive-AI": "area:predictive-ai",
}

PALETTE = {
    "area:core-graph": "6f42c1",
    "area:copilot": "1d76db",
    "area:federation": "0e8a16",
    "area:simulation": "fbca04",
    "area:collaboration": "c5def5",
    "area:predictive-ai": "bfe5bf",
}


def ensure_labels(slug: str, labels):
    out = run(["gh", "api", f"/repos/{slug}/labels?per_page=100"]).stdout
    existing = {l["name"] for l in json.loads(out)} if out.strip() else set()
    for lab in labels:
        if lab in existing:
            continue
        color = PALETTE.get(lab, "cfd3d7")
        run(
            [
                "gh",
                "api",
                "--method",
                "POST",
                f"/repos/{slug}/labels",
                "-f",
                f"name={lab}",
                "-f",
                f"color={color}",
            ]
        )


def issues_with_milestone(slug: str):
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
            "number,title,milestone",
        ]
    ).stdout
    return json.loads(out)


def main():
    run(["gh", "auth", "status"])  # ensure
    slug = repo_slug()
    issues = issues_with_milestone(slug)
    needed = set(AREA_BY_MILESTONE.values())
    ensure_labels(slug, needed)
    for it in issues:
        ms = (it.get("milestone") or {}).get("title")
        area = AREA_BY_MILESTONE.get(ms)
        if not area:
            continue
        num = it["number"]
        print(f"Adding label {area} to #{num} {it['title']}")
        run(["gh", "issue", "edit", str(num), "--repo", slug, "--add-label", area])
    print("Done labeling.")


if __name__ == "__main__":
    main()
