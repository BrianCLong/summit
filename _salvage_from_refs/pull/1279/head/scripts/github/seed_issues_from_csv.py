#!/usr/bin/env python3
import csv, os, subprocess, sys

"""
Reads a CSV with columns: Title,Body,Labels,Milestone and creates GitHub issues via `gh` CLI.
Env:
  REPO_SLUG: owner/repo (defaults to current repo in gh context)
Usage:
  REPO_SLUG=owner/repo python3 scripts/github/seed_issues_from_csv.py project_management/issues-next.csv
"""

def run(cmd, env=None):
  print("$ "+" ".join(cmd))
  res = subprocess.run(cmd, env=env or os.environ.copy())
  if res.returncode != 0:
    sys.exit(res.returncode)

def main():
  if len(sys.argv) < 2:
    print("Usage: seed_issues_from_csv.py <csv_path>")
    sys.exit(1)
  csv_path = sys.argv[1]
  repo = os.environ.get("REPO_SLUG")

  with open(csv_path, newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
      title = row.get('Title', '').strip()
      body = row.get('Body', '').strip()
      labels = [l.strip() for l in (row.get('Labels') or '').split(',') if l.strip()]
      milestone = row.get('Milestone', '').strip() or None

      cmd = ["gh", "issue", "create", "--title", title]
      if body:
        cmd += ["--body", body]
      for lbl in labels:
        cmd += ["--label", lbl]
      if milestone and milestone != '""':
        cmd += ["--milestone", milestone]
      if repo:
        cmd += ["--repo", repo]

      run(cmd)

if __name__ == "__main__":
  main()

