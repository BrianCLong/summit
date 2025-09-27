#!/usr/bin/env python3
import os, sys, zipfile, base64, requests, io

API = "https://api.github.com"

def get_default_branch_sha(session, repo):
    r = session.get(f"{API}/repos/{repo}")
    r.raise_for_status()
    data = r.json()
    default = data["default_branch"]
    ref = session.get(f"{API}/repos/{repo}/git/ref/heads/{default}")
    ref.raise_for_status()
    return default, ref.json()["object"]["sha"]

def create_branch(session, repo, base_sha, branch):
    r = session.post(f"{API}/repos/{repo}/git/refs",
                     json={"ref": f"refs/heads/{branch}", "sha": base_sha})
    if r.status_code == 422 and "Reference already exists" in r.text:
        return
    r.raise_for_status()

def put_file(session, repo, branch, path, content, message):
    b64 = base64.b64encode(content).decode("utf-8")
    url = f"{API}/repos/{repo}/contents/{path}"
    r = session.put(url, json={"message": message, "content": b64, "branch": branch})
    # If exists, update
    if r.status_code == 422 or r.status_code == 409:
        # get sha
        g = session.get(url, params={"ref": branch})
        g.raise_for_status()
        sha = g.json()["sha"]
        r = session.put(url, json={"message": message, "content": b64, "branch": branch, "sha": sha})
    r.raise_for_status()

def main():
    if len(sys.argv) != 3:
        print("Usage: push_via_api.py <owner/repo> <bundle.zip>")
        sys.exit(1)
    repo, zip_path = sys.argv[1], sys.argv[2]
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        print("Missing GITHUB_TOKEN")
        sys.exit(1)
    session = requests.Session()
    session.headers.update({"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"})
    branch = "docs/refresh-2025-08-13"
    default_branch, base_sha = get_default_branch_sha(session, repo)
    create_branch(session, repo, base_sha, branch)

    with zipfile.ZipFile(zip_path, 'r') as z:
        for name in z.namelist():
            if name.endswith('/'):
                continue
            # all files go to repository root relative paths
            with z.open(name) as f:
                content = f.read()
            # strip the top-level folder if present
            parts = name.split('/', 1)
            rel = parts[1] if len(parts) == 2 else parts[0]
            print("Uploading", rel)
            put_file(session, repo, branch, rel, content, f"docs: add {rel} (bundle import)")

    # Open a PR
    r = session.post(f"{API}/repos/{repo}/pulls",
                     json={"title": "docs: refresh 2025-08-13",
                           "head": branch, "base": default_branch,
                           "body": "Docs bundle + CI + issues tooling + seeds & migrations"})
    if r.status_code in (201, 422):
        print(r.json().get("html_url", "PR may already exist."))
    else:
        r.raise_for_status()

if __name__ == "__main__":
    main()
