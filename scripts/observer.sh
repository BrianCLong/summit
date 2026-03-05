#!/bin/bash
set -euo pipefail

OWNER="BrianCLong"
REPO="summit"
BASE="main"
R="$OWNER/$REPO"

OUT="/tmp/summit_observer"
mkdir -p "$OUT"

echo "Observer running. Output: $OUT"
gh auth status -h github.com || true

cycle() {
  TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "=== Cycle @ $TS ==="

  # 0) Baselines: main SHA + recent merges (last 50)
  MAIN_SHA="$(gh api repos/$R/commits/$BASE --jq .sha)" || true
  gh api repos/$R/commits?sha=$BASE\&per_page=50 > "$OUT/main_commits.json" || true

  # 1) Actions pressure: queued/in_progress counts (best-effort)
  # NOTE: GitHub API isn’t a true global queue depth, but this gives pressure signal.
  gh api repos/$R/actions/runs?per_page=100 > "$OUT/actions_runs_page1.json" || true

  # 2) Open PR snapshot (bulk)
  gh pr list -R "$R" --state open --limit 1000 \
    --json number,title,url,isDraft,mergeable,mergeStateStatus,reviewDecision,autoMergeRequest,updatedAt,statusCheckRollup \
    > "$OUT/prs_open.json" || true

  # 3) Branch protection required checks
  gh api -H "Accept: application/vnd.github+json" \
    "repos/$R/branches/$BASE/protection/required_status_checks" \
    > "$OUT/required_status_checks.json" || true

  gh api -H "Accept: application/vnd.github+json" \
    "repos/$R/branches/$BASE/protection" \
    > "$OUT/branch_protection_full.json" || true

  # 4) Analyze and emit reports
  python3 - <<'PY'
import json, csv, os
from collections import Counter, defaultdict
OUT=os.environ.get("OUT","/tmp/summit_observer")

def load(p):
  try:
    with open(p,"r",encoding="utf-8") as f: return json.load(f)
  except Exception: return None

prs = load(f"{OUT}/prs_open.json") or []
runs = load(f"{OUT}/actions_runs_page1.json") or {}
req = load(f"{OUT}/required_status_checks.json") or {}
prot = load(f"{OUT}/branch_protection_full.json") or {}

def extract_required(req, prot):
  required=set()
  if isinstance(req, dict):
    ctx=req.get("contexts")
    if isinstance(ctx, list):
      required |= {c.strip() for c in ctx if isinstance(c,str) and c.strip()}
    checks=req.get("checks")
    if isinstance(checks, list):
      for c in checks:
        if isinstance(c, dict):
          name=(c.get("context") or c.get("name") or "").strip()
          if name: required.add(name)
  if isinstance(prot, dict):
    rsc=prot.get("required_status_checks")
    if isinstance(rsc, dict):
      ctx=rsc.get("contexts")
      if isinstance(ctx, list):
        required |= {c.strip() for c in ctx if isinstance(c,str) and c.strip()}
      checks=rsc.get("checks")
      if isinstance(checks, list):
        for c in checks:
          if isinstance(c, dict):
            name=(c.get("context") or c.get("name") or "").strip()
            if name: required.add(name)
  return sorted(required)

REQUIRED = extract_required(req, prot)

def rollup(pr):
  out=[]
  for item in (pr.get("statusCheckRollup") or []):
    if isinstance(item, dict):
      name=item.get("name") or item.get("context") or item.get("workflowName")
      status=item.get("status") or item.get("state")
      concl=item.get("conclusion")
      if isinstance(name,str) and name.strip():
        out.append((name.strip(), (status or "").upper(), (concl or "").upper()))
  return out

FAIL={"FAILURE","CANCELLED","TIMED_OUT","ACTION_REQUIRED","STARTUP_FAILURE","STALE","ERROR"}
def greenish(pr):
  checks=rollup(pr)
  if not checks: return False
  if any(c in FAIL for _,_,c in checks): return False
  return any(c=="SUCCESS" for _,_,c in checks)

def blockers(pr):
  by=defaultdict(list)
  for (n,s,c) in rollup(pr):
    by[n].append((s,c))
  missing=[]
  incomplete=[]
  non_success=[]
  failing=[]
  for r in REQUIRED:
    if r not in by:
      missing.append(r); continue
    if any(c=="SUCCESS" for _,c in by[r]):
      continue
    if any(s and s!="COMPLETED" for s,c in by[r]):
      incomplete.append(r)
    if all(s=="COMPLETED" for s,c in by[r]):
      non_success.append(r)
    if any(c in FAIL for s,c in by[r]):
      failing.append(r)
  return missing, failing, incomplete, non_success

open_total=len(prs)
state=Counter((p.get("mergeStateStatus") or "UNKNOWN") for p in prs if isinstance(p,dict))
approved=sum(1 for p in prs if isinstance(p,dict) and (p.get("reviewDecision")=="APPROVED") and not p.get("isDraft"))
auto=sum(1 for p in prs if isinstance(p,dict) and p.get("autoMergeRequest") and not p.get("isDraft"))

green=[p for p in prs if isinstance(p,dict) and (not p.get("isDraft")) and greenish(p)]
stuck=[p for p in green if (p.get("mergeStateStatus") or "UNKNOWN")!="CLEAN"]

# Produce drift: required contexts not observed in any open PR rollup
produced=set()
for p in prs:
  if isinstance(p,dict):
    produced |= {n for (n,_,_) in rollup(p)}
missing_required=[r for r in REQUIRED if r not in produced]

# green-but-stuck CSV
csv_path=f"{OUT}/green_but_stuck.csv"
with open(csv_path,"w",newline="",encoding="utf-8") as f:
  w=csv.writer(f)
  w.writerow(["number","mergeStateStatus","mergeable","reviewDecision","autoMergeEnabled","missing_req","failing_req","incomplete_req","url","updatedAt"])
  for p in sorted(stuck, key=lambda x: x.get("updatedAt") or "", reverse=True)[:200]:
    m,fai,inc,ns=blockers(p)
    w.writerow([p.get("number"),p.get("mergeStateStatus"),p.get("mergeable"),p.get("reviewDecision"),bool(p.get("autoMergeRequest")),
                len(m),len(fai),len(inc),p.get("url"),p.get("updatedAt")])

# required drift markdown
with open(f"{OUT}/required_contexts_drift.md","w",encoding="utf-8") as f:
  f.write("# Required Context Drift\n\n")
  f.write(f"- Required contexts: **{len(REQUIRED)}**\n")
  f.write(f"- Produced contexts observed in open PRs: **{len(produced)}**\n\n")
  f.write("## Required contexts missing across open PRs\n")
  if missing_required:
    for r in missing_required: f.write(f"- {r}\n")
  else:
    f.write("- (None)\n")

# Actions pressure (best-effort)
queued=inprog=0
if isinstance(runs, dict):
  for rr in (runs.get("workflow_runs") or []):
    st=(rr.get("status") or "").lower()
    if st=="queued": queued+=1
    if st=="in_progress": inprog+=1

metrics={
  "open_prs_total": open_total,
  "approved_prs": approved,
  "auto_merge_enabled_prs": auto,
  "greenish_prs": len(green),
  "green_but_stuck_prs": len(stuck),
  "mergeStateStatus_distribution": dict(state),
  "required_contexts_count": len(REQUIRED),
  "required_contexts_missing_globally_count": len(missing_required),
  "actions_runs_page1_queued": queued,
  "actions_runs_page1_in_progress": inprog,
}
with open(f"{OUT}/metrics.json","w",encoding="utf-8") as f:
  json.dump(metrics,f,indent=2)

# One-page summary with recommended action
def recommend(m):
  # Prioritize systemic blockers
  if m["required_contexts_missing_globally_count"]>0:
    return "PRIMARY: Required-check drift detected (required contexts missing). Merge/ship workflow name/trigger fix (Jules lane) BEFORE scaling auto-merge."
  if m["actions_runs_page1_queued"]>60 or m["actions_runs_page1_in_progress"]>60:
    return "PRIMARY: Actions pressure high. Reduce new auto-merge batch size; prioritize Antigravity concurrency/cancel-in-progress PR."
  if m["green_but_stuck_prs"]>0:
    return "PRIMARY: Green-but-stuck exists without global drift. Inspect top 10 stuck PRs for review/CODEOWNERS/mergeable=false blockers."
  return "OK: No immediate systemic blocker detected. Continue controlled auto-merge batching."

rec = recommend(metrics)

with open(f"{OUT}/summary.md","w",encoding="utf-8") as f:
  f.write("# Summit Observer — Merge Train Health\n\n")
  f.write(f"- Open PRs: **{open_total}**\n")
  f.write(f"- Approved PRs: **{approved}**\n")
  f.write(f"- Auto-merge enabled: **{auto}**\n")
  f.write(f"- Green-ish PRs: **{len(green)}**\n")
  f.write(f"- Green-but-stuck: **{len(stuck)}**\n")
  f.write(f"- Required contexts missing globally: **{len(missing_required)}**\n")
  f.write(f"- Actions (page1) queued/in_progress: **{queued}/{inprog}** (pressure signal)\n\n")
  f.write("## Recommended next action\n")
  f.write(f"- {rec}\n\n")
  f.write("## mergeStateStatus distribution\n")
  for k,v in sorted(state.items(), key=lambda kv: kv[1], reverse=True):
    f.write(f"- {k}: {v}\n")
PY

  echo "Wrote: $OUT/summary.md (plus metrics.json, green_but_stuck.csv, required_contexts_drift.md)"
}

export OUT
while true; do
  cycle
  echo "Sleeping 10 minutes..."
  sleep 600
done
