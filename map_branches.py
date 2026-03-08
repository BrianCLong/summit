import json
import subprocess
import sys


def get_pr_data():
    try:
        with open('pr-open.json') as f:
            return json.load(f)
    except FileNotFoundError:
        print("pr-open.json not found")
        return []

def get_remote_branches():
    result = subprocess.run(['git', 'branch', '-r'], capture_output=True, text=True)
    return [b.strip() for b in result.stdout.splitlines() if '->' not in b]

def get_last_commit_msg(branch):
    result = subprocess.run(['git', 'log', '-1', '--format=%s', branch], capture_output=True, text=True)
    return result.stdout.strip()

def main():
    prs = get_pr_data()
    branches = get_remote_branches()

    print(f"Found {len(prs)} PRs and {len(branches)} branches.")

    mapping = []

    # Pre-fetch commit msgs for performance? No, just do it.

    for pr in prs:
        title = pr.get('title', '')
        number = pr.get('number', '')
        found_branch = None

        # Heuristic: check if branch name contains the number (if widely used convention)
        # or check if commit msg matches title.

        for branch in branches:
            # Check for PR number in branch name (e.g. feature/123-foo)
            if str(number) in branch:
                found_branch = branch
                break

            # Check commit message (slower)
            # msg = get_last_commit_msg(branch)
            # if title in msg:
            #     found_branch = branch
            #     break

        # If not found by number, try title matching on a subset of branches?
        # Listing all commit messages is too slow for 100 branches?
        # Let's try to list all branches with their last commit subject in one go

        entry = {
            "number": number,
            "title": title,
            "branch": found_branch,
            "risk": [l['name'] for l in pr.get('labels', []) if 'risk' in l['name']]
        }
        mapping.append(entry)

    # Output table
    print(f"{'PR #':<6} | {'Branch':<50} | {'Title':<50}")
    print("-" * 110)
    for m in mapping:
        print(f"{m['number']:<6} | {str(m['branch']):<50} | {m['title'][:50]}")

if __name__ == "__main__":
    main()
