#!/usr/bin/env python3
import csv, json, os, subprocess, sys, tempfile

REPO_SLUG = os.environ.get("REPO_SLUG", "BrianCLong/intelgraph")
PROJECT_TITLE = os.environ.get("PROJECT_TITLE", "IntelGraph Execution Board")
PROJECT_OWNER = os.environ.get("PROJECT_OWNER", REPO_SLUG.split("/")[0])
ASSIGNEE = os.environ.get("ASSIGNEE", "")  # optional single assignee handle

def run(cmd, input_bytes=None):
  res = subprocess.run(cmd, input=input_bytes, capture_output=True)
  if res.returncode != 0:
    sys.stderr.write(res.stderr.decode())
    raise SystemExit(res.returncode)
  return res.stdout.decode()

def gh_graphql(query):
  return run(["gh", "api", "graphql", "-f", f"query={query}"])

def get_project_and_status_field():
  query = f"""
  query {{
    repositoryOwner(login: \"{PROJECT_OWNER}\") {{
      ... on Organization {{
        projectsV2(first: 50) {{ nodes {{ id title url fields(first: 50) {{ nodes {{ id name dataType __typename ... on ProjectV2SingleSelectField {{ options {{ id name }} }} }} }} }} }}
      }}
      ... on User {{
        projectsV2(first: 50) {{ nodes {{ id title url fields(first: 50) {{ nodes {{ id name dataType __typename ... on ProjectV2SingleSelectField {{ options {{ id name }} }} }} }} }} }}
      }}
    }}
  }}
  """
  data = json.loads(gh_graphql(query))
  nodes = []
  owner = data["data"]["repositoryOwner"]
  if "projectsV2" in owner and owner["projectsV2"]:
    nodes = owner["projectsV2"]["nodes"]
  project = next((n for n in nodes if n["title"] == PROJECT_TITLE), None)
  if not project:
    print(f"Project '{PROJECT_TITLE}' not found for owner {PROJECT_OWNER}")
    raise SystemExit(1)
  status_field = None
  for fld in project["fields"]["nodes"]:
    if fld["name"] == "Status":
      status_field = fld
      break
  if not status_field:
    print("Status field not found in project")
    raise SystemExit(1)
  return project["id"], status_field["id"], status_field.get("options", [])

def issue_node_id(owner, repo, number):
  out = run(["gh", "api", f"repos/{owner}/{repo}/issues/{number}"])
  return json.loads(out)["node_id"]

def add_item_to_project(project_id, content_id):
  q = f"""
  mutation {{
    addProjectV2ItemById(input: {{ projectId: \"{project_id}\", contentId: \"{content_id}\" }}) {{ item {{ id }} }}
  }}
  """
  data = json.loads(gh_graphql(q))
  return data["data"]["addProjectV2ItemById"]["item"]["id"]

def set_status_field(project_id, item_id, field_id, option_id):
  q = f"""
  mutation {{
    updateProjectV2ItemFieldValue(input: {{ projectId: \"{project_id}\", itemId: \"{item_id}\", fieldId: \"{field_id}\", value: {{ singleSelectOptionId: \"{option_id}\" }} }}) {{ projectV2Item {{ id }} }}
  }}
  """
  gh_graphql(q)

def main():
  if len(sys.argv) < 3:
    print("Usage: seed_issues_to_project_v2.py <csv_path> <Status: Now|Next|Later>")
    sys.exit(1)
  csv_path = sys.argv[1]
  status = sys.argv[2]
  owner, repo = REPO_SLUG.split("/")

  project_id, status_field_id, options = get_project_and_status_field()
  option = next((o for o in options if o.get("name") == status), None)
  if not option:
    print(f"Status option '{status}' not found in project field")
    sys.exit(1)
  option_id = option["id"]

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
      if ASSIGNEE:
        cmd += ["--assignee", ASSIGNEE]
      cmd += ["--repo", REPO_SLUG, "--json", "number"]
      out = run(cmd)
      num = json.loads(out)["number"]
      node_id = issue_node_id(owner, repo, num)
      item_id = add_item_to_project(project_id, node_id)
      set_status_field(project_id, item_id, status_field_id, option_id)
      print(f"Created issue #{num} and set Status={status}")

if __name__ == "__main__":
  main()

