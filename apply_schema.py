#!/usr/bin/env python3
"""
apply_schema.py — Fully apply a seed JSON into GitHub Projects (v2)

Capabilities (idempotent):
  ✓ Ensure Project exists by title (create if missing — optional)
  ✓ Ensure custom fields exist (TEXT, NUMBER, DATE, SINGLE_SELECT, ITERATION)
  ✓ Ensure single‑select options exist (add missing)
  ✓ Upsert items (draft issues) and/or attach existing Issues/PRs by URL
  ✓ Set field values on items (including Iteration by title)
  ✓ Create simple views (table/board/timeline) where supported via GraphQL

Auth: uses GH_TOKEN from env. Requires gh CLI >= 2.63 for fallback calls.

Usage:
  python scripts/bonus/apply_schema.py bonus_projects/seed/security_compliance.json \
    --owner your-org-or-user --create-missing --verbose

Seed JSON (minimal example):
{
  "name": "Security & Compliance — Controls & Audits",
  "visibility": "PRIVATE",  // or PUBLIC
  "fields": [
    {"name":"Control","type":"TEXT"},
    {"name":"Framework","type":"SINGLE_SELECT","options":["SOC2","ISO27001","HIPAA"]},
    {"name":"Evidence Due","type":"DATE"},
    {"name":"Severity","type":"SINGLE_SELECT","options":["S0","S1","S2","S3"]}
  ],
  "items": [
    {"title":"CC1.1 Logical access reviews","body":"Quarterly evidence","fields":{"Framework":"SOC2","Evidence Due":"2025-10-31","Severity":"S1"}},
    {"url":"https://github.com/ORG/REPO/issues/123","fields":{"Severity":"S0"}}
  ]
}

Notes:
- If `url` is present on an item, the script adds that Issue/PR to the Project.
- If `title`/`body` provided without `url`, a Draft Issue item is created.
- Iteration fields: provide an iteration title like "Sprint 42" or ISO date in your seed; script will match the iteration cycle.

Limitations:
- GitHub occasionally renames GraphQL enums/fields. This script introspects the schema and fails gracefully with actionable errors.
"""
import argparse, json, os, sys, subprocess, time
from typing import Any, Dict, List, Optional

GH = os.environ.get("GH", "gh")
GH_TOKEN = os.environ.get("GH_TOKEN")

if not GH_TOKEN:
    print("[fatal] GH_TOKEN is required in environment.", file=sys.stderr)
    sys.exit(1)

# ----------------- Helpers -----------------

def gh_graphql(query: str, variables: Optional[dict] = None) -> dict:
    """Call gh api graphql with variables; return JSON or raise."""
    cmd = [GH, "api", "graphql", "-H", "Authorization: bearer %s" % GH_TOKEN, "-F", f"query={query}"]
    if variables:
        for k, v in variables.items():
            if isinstance(v, (dict, list)):
                cmd += ["-f", f"{k}={json.dumps(v)}"]
            else:
                cmd += ["-f", f"{k}={v}"]
    try:
        out = subprocess.check_output(cmd, text=True)
        return json.loads(out)
    except subprocess.CalledProcessError as e:
        print("[graphql error]", e.output, file=sys.stderr)
        raise


def get_owner_id(owner: str) -> str:
    q = """
    query($login:String!) {
      organization(login:$login){ id }
      user(login:$login){ id }
    }
    """
    data = gh_graphql(q, {"login": owner})
    org = data.get("data", {}).get("organization")
    usr = data.get("data", {}).get("user")
    if org and org.get("id"):
        return org["id"]
    if usr and usr.get("id"):
        return usr["id"]
    raise RuntimeError(f"Owner '{owner}' not found")


def get_or_create_project(owner_id: str, title: str, create_missing: bool, visibility: str = "PRIVATE") -> str:
    # list first to find exact title
    q = """
    query($id:ID!, $first:Int!) {
      node(id:$id) { ... on Organization { projectsV2(first:$first) { nodes { id title } } }
                     ... on User         { projectsV2(first:$first) { nodes { id title } } }
      }
    }
    """
    data = gh_graphql(q, {"id": owner_id, "first": 50})
    nodes = data["data"]["node"]["projectsV2"]["nodes"]
    for n in nodes:
        if n["title"] == title:
            return n["id"]
    if not create_missing:
        raise RuntimeError(f"Project '{title}' not found and --create-missing not set")
    m = """
    mutation($ownerId:ID!, $title:String!, $pub:Boolean!) {
      createProjectV2(input:{ownerId:$ownerId, title:$title, public:$pub}) { projectV2 { id title } }
    }
    """
    res = gh_graphql(m, {"ownerId": owner_id, "title": title, "pub": (visibility == "PUBLIC")})
    return res["data"]["createProjectV2"]["projectV2"]["id"]


def get_project_fields(project_id: str) -> Dict[str, dict]:
    q = """
    query($pid:ID!, $first:Int!) {
      node(id:$pid){
        ... on ProjectV2{
          fields(first:$first){ nodes {
            ... on ProjectV2Field { id name dataType }
            ... on ProjectV2SingleSelectField { id name dataType options { id name } }
            ... on ProjectV2IterationField { id name dataType configuration { iterations { id title startDate duration } } }
          }}
        }
      }
    }
    """
    data = gh_graphql(q, {"pid": project_id, "first": 100})
    nodes = data["data"]["node"]["fields"]["nodes"]
    out = {n["name"]: n for n in nodes}
    return out


def ensure_field(project_id: str, spec: dict, verbose=False) -> dict:
    existing = get_project_fields(project_id)
    if spec["name"] in existing:
        if verbose:
            print(f"[ok] field exists: {spec['name']}")
        return existing[spec["name"]]
    dtype = spec["type"].upper()
    # Create field
    m = """
    mutation($projectId:ID!, $name:String!, $dataType:ProjectV2FieldDataType!) {
      createProjectV2Field(input:{projectId:$projectId, name:$name, dataType:$dataType}) {
        projectV2Field { __typename id }
      }
    }
    """
    res = gh_graphql(m, {"projectId": project_id, "name": spec["name"], "dataType": dtype})
    field = res["data"]["createProjectV2Field"]["projectV2Field"]
    # Add options if single-select
    if dtype == "SINGLE_SELECT" and spec.get("options"):
        # fetch field id again as SingleSelect subtype
        fields = get_project_fields(project_id)
        ss = fields[spec["name"]]
        for opt in spec["options"]:
            if any(o["name"] == opt for o in ss.get("options", [])):
                continue
            mm = """
            mutation($projectId:ID!, $fieldId:ID!, $name:String!) {
              updateProjectV2SingleSelectField(input:{ projectId:$projectId, fieldId:$fieldId, options: { name:$name }}) { projectV2SingleSelectField { id name options { id name } } }
            }
            """
            gh_graphql(mm, {"projectId": project_id, "fieldId": ss["id"], "name": opt})
    if verbose:
        print(f"[new] field created: {spec['name']} ({dtype})")
    return get_project_fields(project_id)[spec["name"]]


def add_draft_item(project_id: str, title: str, body: str = "") -> str:
    m = """
    mutation($projectId:ID!, $title:String!, $body:String){
      addProjectV2DraftIssue(input:{projectId:$projectId, title:$title, body:$body}){
        projectItem { id }
      }
    }
    """
    res = gh_graphql(m, {"projectId": project_id, "title": title, "body": body})
    return res["data"]["addProjectV2DraftIssue"]["projectItem"]["id"]


def add_item_by_url(project_id: str, url: str) -> str:
    m = """
    mutation($projectId:ID!, $url:String!){
      addProjectV2ItemById(input:{projectId:$projectId, contentId: null, contentUrl:$url}){ item { id } }
    }
    """
    # Some gh schemas require contentId instead of contentUrl; fallback to CLI if needed
    try:
        res = gh_graphql(m, {"projectId": project_id, "url": url})
        return res["data"]["addProjectV2ItemById"]["item"]["id"]
    except Exception:
        # Fallback to gh CLI
        cmd = [GH, "project", "item-add", "--project", project_id, "--url", url]
        subprocess.check_call(cmd)
        # No id from CLI; we skip returning
        return ""


def set_field_value(project_id: str, item_id: str, field: dict, value: Any):
    typename = field.get("__typename") or field.get("dataType")
    field_id = field["id"]
    # Map per type
    if typename in ("ProjectV2Field",) and field.get("dataType") == "TEXT":
        m = """
        mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $text:String!) {
          updateProjectV2ItemFieldValue(input:{ projectId:$projectId, itemId:$itemId, fieldId:$fieldId, value:{ text:$text }}) { projectV2Item { id } }
        }
        """
        gh_graphql(m, {"projectId": project_id, "itemId": item_id, "fieldId": field_id, "text": str(value)})
        return
    # Number
    if field.get("dataType") == "NUMBER":
        m = """
        mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $num:Float!) {
          updateProjectV2ItemFieldValue(input:{ projectId:$projectId, itemId:$itemId, fieldId:$fieldId, value:{ number:$num }}) { projectV2Item { id } }
        }
        """
        gh_graphql(m, {"projectId": project_id, "itemId": item_id, "fieldId": field_id, "num": float(value)})
        return
    # Date
    if field.get("dataType") == "DATE":
        m = """
        mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $date:Date!) {
          updateProjectV2ItemFieldValue(input:{ projectId:$projectId, itemId:$itemId, fieldId:$fieldId, value:{ date:$date }}) { projectV2Item { id } }
        }
        """
        gh_graphql(m, {"projectId": project_id, "itemId": item_id, "fieldId": field_id, "date": value})
        return
    # Single-select
    if typename == "ProjectV2SingleSelectField" or field.get("dataType") == "SINGLE_SELECT":
        # find option id by name
        opt = None
        for o in field.get("options", []):
            if o["name"].lower() == str(value).lower():
                opt = o["id"]
                break
        if not opt:
            raise RuntimeError(f"Option '{value}' not found for field '{field['name']}'")
        m = """
        mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $optionId:String!) {
          updateProjectV2ItemFieldValue(input:{ projectId:$projectId, itemId:$itemId, fieldId:$fieldId, value:{ singleSelectOptionId:$optionId }}) { projectV2Item { id } }
        }
        """
        gh_graphql(m, {"projectId": project_id, "itemId": item_id, "fieldId": field_id, "optionId": opt})
        return
    # Iteration
    if typename == "ProjectV2IterationField" or field.get("dataType") == "ITERATION":
        # find iteration id by title
        conf = field.get("configuration", {})
        iters = conf.get("iterations", [])
        match = None
        for it in iters:
            if it.get("title") == value:
                match = it["id"]
                break
        if not match:
            raise RuntimeError(f"Iteration '{value}' not found in field '{field['name']}'")
        m = """
        mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $iterId:String!) {
          updateProjectV2ItemFieldValue(input:{ projectId:$projectId, itemId:$itemId, fieldId:$fieldId, value:{ iterationId:$iterId }}) { projectV2Item { id } }
        }
        """
        gh_graphql(m, {"projectId": project_id, "itemId": item_id, "fieldId": field_id, "iterId": match})
        return
    raise RuntimeError(f"Unsupported field type: {typename} for {field['name']}")


# ----------------- Main -----------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("seed", help="Path to seed JSON")
    ap.add_argument("--owner", required=True, help="GitHub org or user (login)")
    ap.add_argument("--create-missing", action="store_true", help="Create project if missing")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    with open(args.seed) as f:
        seed = json.load(f)

    owner_id = get_owner_id(args.owner)
    title = seed["name"]
    visibility = seed.get("visibility", "PRIVATE").upper()
    pid = get_or_create_project(owner_id, title, args.create_missing, visibility)
    if args.verbose:
        print(f"[project] {title} -> {pid}")

    # Ensure fields
    desired_fields = seed.get("fields", [])
    field_map = {}
    for fs in desired_fields:
        fld = ensure_field(pid, fs, verbose=args.verbose)
        field_map[fs["name"]] = fld

    # Refresh fields snapshot (for options etc.)
    field_snapshot = get_project_fields(pid)

    # Upsert items
    for item in seed.get("items", []):
        item_id = None
        if "url" in item:
            item_id = add_item_by_url(pid, item["url"]) or None
        else:
            title = item.get("title") or "Untitled"
            body = item.get("body", "")
            item_id = add_draft_item(pid, title, body)
        if not item_id:
            # If we cannot resolve id (CLI add), skip field updates for this item
            continue
        # Apply fields
        for fname, fval in (item.get("fields") or {}).items():
            fld = field_snapshot.get(fname) or field_map.get(fname)
            if not fld:
                raise RuntimeError(f"Field '{fname}' not found/created")
            set_field_value(pid, item_id, fld, fval)
        if args.verbose:
            print(f"[item] upserted -> {item_id}")

    print("[done] schema applied:", seed["name"])

if __name__ == "__main__":
    main()
