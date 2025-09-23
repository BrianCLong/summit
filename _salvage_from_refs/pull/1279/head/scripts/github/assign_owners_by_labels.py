#!/usr/bin/env python3
import os, sys, json, subprocess

try:
  import yaml  # type: ignore
except Exception:
  print("Requires PyYAML: pip install pyyaml", file=sys.stderr)
  sys.exit(1)

REPO_SLUG = os.environ.get("REPO_SLUG", "BrianCLong/summit")
MAPPING_FILE = os.environ.get("OWNERS_FILE", "project_management/owners.yaml")

def run(cmd):
  res = subprocess.run(cmd, capture_output=True)
  if res.returncode != 0:
    sys.stderr.write(res.stderr.decode())
    sys.exit(res.returncode)
  return res.stdout.decode()

def main():
  if not os.path.exists(MAPPING_FILE):
    print(f"Mapping file not found: {MAPPING_FILE}")
    sys.exit(1)
  owners = yaml.safe_load(open(MAPPING_FILE)) or {}
  label_owners = owners.get('label_owners', {})

  issues = json.loads(run(["gh", "issue", "list", "--repo", REPO_SLUG, "--state", "open", "--json", "number,labels"]))
  for issue in issues:
    num = issue['number']
    labels = [l['name'] for l in issue.get('labels', [])]
    assignees = set()
    for lbl in labels:
      if lbl in label_owners and label_owners[lbl]:
        assignees.add(label_owners[lbl])
    if assignees:
      args = ["gh", "issue", "edit", str(num), "--repo", REPO_SLUG]
      for a in assignees:
        args += ["--add-assignee", a]
      print(f"Assigning {','.join(assignees)} to issue #{num}")
      run(args)

if __name__ == "__main__":
  main()

