import csv
import os
import subprocess
import sys
from pathlib import Path


def run(cmd, check=True, capture_output=True, text=True):
    return subprocess.run(cmd, check=check, capture_output=capture_output, text=text)


def gh_repo_slug():
    try:
        out = run(
            ["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]
        ).stdout.strip()
        if out:
            return out
    except subprocess.CalledProcessError:
        pass
    # fallback to git remote
    try:
        url = run(["git", "remote", "get-url", "origin"]).stdout.strip()
        # handle "git@github.com:owner/repo.git" and https
        if url.startswith("git@github.com:"):
            slug = url.split(":", 1)[1]
        else:
            slug = url.split("github.com/")[1]
        return slug.rstrip(".git")
    except Exception as e:
        raise SystemExit(f"Unable to detect repo slug: {e}")


def ensure_milestones(slug: str, titles):
    # list existing milestones (open + closed)
    import json

    existing = set()
    try:
        out_open = run(["gh", "api", f"/repos/{slug}/milestones?state=open"]).stdout
        if out_open.strip():
            existing.update(m["title"] for m in json.loads(out_open))
        out_closed = run(["gh", "api", f"/repos/{slug}/milestones?state=closed"]).stdout
        if out_closed.strip():
            existing.update(m["title"] for m in json.loads(out_closed))
    except subprocess.CalledProcessError as e:
        raise SystemExit(f"Failed to list milestones. Ensure gh is authenticated.\n{e.stderr}")
    for t in titles:
        if not t or t in existing:
            continue
        # create milestone
        try:
            run(
                [
                    "gh",
                    "api",
                    "--method",
                    "POST",
                    f"/repos/{slug}/milestones",
                    "-f",
                    f"title={t}",
                    "-f",
                    "state=open",
                ]
            )
            print(f"Created milestone: {t}")
        except subprocess.CalledProcessError as e:
            # ignore if already exists or cannot create
            print(f"Warning: could not create milestone '{t}': {e.stderr.strip()}")


def ensure_labels(slug: str, labels):
    import json

    existing = set()
    try:
        out = run(["gh", "api", f"/repos/{slug}/labels?per_page=100"]).stdout
        if out.strip():
            existing.update(l["name"] for l in json.loads(out))
    except subprocess.CalledProcessError as e:
        raise SystemExit(f"Failed to list labels. Ensure gh is authenticated.\n{e.stderr}")

    # basic color palette
    default_color = "cfd3d7"
    palette = {
        "mvp1": "0e8a16",
        "epic": "5319e7",
        "backend": "1d76db",
        "frontend": "fbca04",
        "UX": "c5def5",
        "AI": "bfdadc",
        "schema": "d4c5f9",
        "data-model": "d4c5f9",
        "notifications": "f9d0c4",
        "federation": "c2e0c6",
        "realtime": "fef2c0",
        "reporting": "bfe5bf",
    }

    for lab in sorted(set(labels)):
        if not lab or lab in existing:
            continue
        color = palette.get(lab, default_color)
        try:
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
            print(f"Created label: {lab}")
        except subprocess.CalledProcessError as e:
            print(f"Warning: could not create label '{lab}': {e.stderr.strip()}")


def create_issue(slug: str, title: str, body: str, labels: list[str], milestone: str | None):
    cmd = ["gh", "issue", "create", "--repo", slug, "--title", title]
    # write body to a temp file to avoid shell quoting issues
    import tempfile

    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".md") as tf:
        tf.write(body)
        body_file = tf.name
    cmd += ["--body-file", body_file]
    for lab in labels:
        if lab:
            cmd += ["--label", lab]
    if milestone:
        cmd += ["--milestone", milestone]
    # Create issue
    try:
        run(cmd)
    except subprocess.CalledProcessError as e:
        sys.stderr.write(e.stderr or "Unknown error from gh")
        raise
    finally:
        try:
            os.unlink(body_file)
        except OSError:
            pass


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/import_issues_csv.py project_management/issues_mvp1.csv")
        sys.exit(2)

    csv_path = Path(sys.argv[1])
    if not csv_path.exists():
        raise SystemExit(f"CSV not found: {csv_path}")

    # Verify gh auth
    try:
        run(["gh", "auth", "status"], check=True)
    except subprocess.CalledProcessError:
        raise SystemExit("GitHub CLI not authenticated. Run 'gh auth login' and retry.")

    slug = gh_repo_slug()
    print(f"Repo: {slug}")

    # Parse CSV
    rows = []
    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    # Ensure milestones
    ms_titles = sorted({r.get("Milestone", "").strip() for r in rows if r.get("Milestone")})
    ensure_milestones(slug, ms_titles)

    # Ensure labels
    all_labels = []
    for r in rows:
        labels_str = r.get("Labels", "")
        if labels_str:
            all_labels.extend([s.strip() for s in labels_str.split(",") if s.strip()])
    ensure_labels(slug, all_labels)

    # Create issues
    count = 0
    for r in rows:
        title = (r.get("Title") or "").strip()
        if not title:
            continue
        body = r.get("Body", "").replace("\r\n", "\n")
        labels = []
        labels_str = r.get("Labels", "")
        if labels_str:
            labels = [s.strip() for s in labels_str.split(",") if s.strip()]
        milestone = r.get("Milestone", "").strip() or None

        print(f"Creating: {title}")
        create_issue(slug, title, body, labels, milestone)
        count += 1

    print(f"Created {count} issues.")


if __name__ == "__main__":
    main()
