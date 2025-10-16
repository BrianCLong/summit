import argparse
import os
import re
import subprocess


def run_command(cmd):
    print(f"Executing: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-B", "--base", default="main")
    parser.add_argument("--labels")
    parser.add_argument("--milestone")
    parser.add_argument("--repo")
    args = parser.parse_args()

    wave = "v25"
    base_dir = os.path.join("project_management", "pr_drafts", wave)

    for filename in sorted(os.listdir(base_dir)):
        if not filename.startswith("PR-") or not filename.endswith(".md"):
            continue

        filepath = os.path.join(base_dir, filename)
        print(f"==> Processing draft: {filepath}")

        with open(filepath) as f:
            content = f.read()

        title = content.split("\n")[0].replace("# ", "").strip()
        body = "\n".join(content.split("\n")[1:])

        # Robust slug generation
        slug = re.sub(r"^PR-\d+-", "", filename.replace(".md", ""))
        slug = re.sub(r"[^a-zA-Z0-9-]", "-", slug).strip("-")

        branch_name = f"feature/{wave}/{slug}"

        print(f"  - Title: {title}")
        print(f"  - Branch: {branch_name}")

        if not slug:
            print(f"Error: Slug is empty for file {filename}")
            continue

        try:
            # Check if branch exists locally
            result = subprocess.run(
                ["git", "branch", "--list", branch_name], capture_output=True, text=True
            )
            if result.stdout.strip():
                print(f"Branch {branch_name} already exists locally. Checking it out.")
                run_command(["git", "checkout", branch_name])
            else:
                print(f"Creating new branch {branch_name}.")
                run_command(["git", "checkout", args.base])
                run_command(["git", "checkout", "-b", branch_name])

            run_command(
                ["git", "commit", "--allow-empty", "-m", f"feat({wave}): initial commit for {slug}"]
            )
            run_command(["git", "push", "-u", "origin", branch_name])
            run_command(
                [
                    "gh",
                    "pr",
                    "create",
                    "--repo",
                    args.repo,
                    "--title",
                    title,
                    "--body",
                    body,
                    "--label",
                    args.labels,
                    "--milestone",
                    args.milestone,
                    "--base",
                    args.base,
                    "--head",
                    branch_name,
                ]
            )
            run_command(["git", "checkout", args.base])
        except Exception as e:
            print(f"Failed to process {filename}: {e}")
            run_command(["git", "checkout", args.base])  # Attempt to reset state

    print("==> All PRs published.")


if __name__ == "__main__":
    main()
