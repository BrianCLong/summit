import json
import subprocess


def run(cmd, check=True):
    return subprocess.run(cmd, check=check, text=True, capture_output=True)


def repo_slug():
    return run(
        ["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]
    ).stdout.strip()


def main():
    run(["gh", "auth", "status"])  # ensure
    slug = repo_slug()
    # List all MVP1 issues
    issues = json.loads(
        run(
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
                "number,title,labels",
            ]
        ).stdout
    )
    # Determine epics by label
    for it in issues:
        labels = {l["name"] for l in it.get("labels", [])}
        is_epic = "epic" in labels or it["title"].startswith("Epic:")
        if is_epic:
            print(f"Assign epic #{it['number']} to @BrianCLong")
            run(
                [
                    "gh",
                    "issue",
                    "edit",
                    str(it["number"]),
                    "--repo",
                    slug,
                    "--add-assignee",
                    "BrianCLong",
                ]
            )
    print("Assignment done.")


if __name__ == "__main__":
    main()
