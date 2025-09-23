#!/usr/bin/env python3
import csv, os, sys, requests

def upsert_issue(repo, token, row):
    url = f"https://api.github.com/repos/{repo}/issues"
    headers = {"Authorization": f"Bearer {token}",
               "Accept": "application/vnd.github+json"}
    title = row["title"].strip()
    body = row.get("body","")
    labels = [l.strip() for l in row.get("labels","").split(",") if l.strip()]
    assignees = [a.strip() for a in row.get("assignees","").split(",") if a.strip()]

    # Try to find existing open issue with same title
    search = requests.get(f"https://api.github.com/search/issues",
                          headers=headers,
                          params={"q": f'repo:{repo} is:issue is:open in:title "{title}"'}).json()
    if search.get("total_count",0) > 0:
        number = search["items"][0]["number"]
        r = requests.patch(f"https://api.github.com/repos/{repo}/issues/{number}",
                           headers=headers, json={"title": title, "body": body, "labels": labels, "assignees": assignees})
        r.raise_for_status()
        print(f"Updated issue #{number}: {title}")
    else:
        r = requests.post(url, headers=headers, json={"title": title, "body": body, "labels": labels, "assignees": assignees})
        r.raise_for_status()
        num = r.json()["number"]
        print(f"Created issue #{num}: {title}")

def main():
    if len(sys.argv) != 3:
        print("Usage: bulk_update_issues.py <owner/repo> <csv_path>")
        sys.exit(1)
    repo, csv_path = sys.argv[1], sys.argv[2]
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        print("Missing GITHUB_TOKEN")
        sys.exit(1)
    with open(csv_path, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            upsert_issue(repo, token, row)

if __name__ == "__main__":
    main()
