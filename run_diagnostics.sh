set -euo pipefail

OWNER="BrianCLong"
REPO="summit"
BASE="main"
R="$OWNER/$REPO"

WORKDIR="/tmp/summit_merge_diag"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

echo "Workdir: $WORKDIR"
gh auth status -h github.com || echo "gh auth status failed"

# Required status checks contexts (legacy) + checks (newer API) if present
gh api -H "Accept: application/vnd.github+json" \
  "repos/$R/branches/$BASE/protection/required_status_checks" \
  > required_status_checks.json || echo "WARN: required_status_checks endpoint failed"

# Required PR review rules (helps explain mergeStateStatus=BLOCKED)
gh api -H "Accept: application/vnd.github+json" \
  "repos/$R/branches/$BASE/protection/required_pull_request_reviews" \
  > required_pr_reviews.json || echo "WARN: required_pr_reviews endpoint failed"

# Full branch protection (sometimes needed to see required contexts via different shapes)
gh api -H "Accept: application/vnd.github+json" \
  "repos/$R/branches/$BASE/protection" \
  > branch_protection_full.json || echo "WARN: branch_protection_full endpoint failed"

# NOTE: If gh errors on an unknown json field, remove that field and retry.
gh pr list -R "$R" --state open --limit 1000 \
  --json number,title,url,isDraft,mergeable,mergeStateStatus,reviewDecision,autoMergeRequest,headRefName,baseRefName,updatedAt,labels,statusCheckRollup \
  > prs_open.json || echo "WARN: gh pr list failed"

python3 - <<'PY'
import json, os, csv
from collections import Counter, defaultdict

workdir = os.getcwd()

def load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None

prs = load_json("prs_open.json") or []
req_status = load_json("required_status_checks.json") or {}
req_reviews = load_json("required_pr_reviews.json") or {}
branch_prot = load_json("branch_protection_full.json") or {}

# Extract required check names robustly across API shapes
required = set()

# 1) required_status_checks endpoint
if isinstance(req_status, dict):
    for k in ("contexts",):
        v = req_status.get(k)
        if isinstance(v, list):
            for x in v:
                if isinstance(x, str) and x.strip():
                    required.add(x.strip())

    checks = req_status.get("checks")
    if isinstance(checks, list):
        for c in checks:
            if isinstance(c, dict):
                ctx = c.get("context") or c.get("name")
                if isinstance(ctx, str) and ctx.strip():
                    required.add(ctx.strip())

# 2) branch_protection_full endpoint fallbacks
if isinstance(branch_prot, dict):
    rsc = branch_prot.get("required_status_checks")
    if isinstance(rsc, dict):
        ctxs = rsc.get("contexts")
        if isinstance(ctxs, list):
            for x in ctxs:
                if isinstance(x, str) and x.strip():
                    required.add(x.strip())
        checks = rsc.get("checks")
        if isinstance(checks, list):
            for c in checks:
                if isinstance(c, dict):
                    ctx = c.get("context") or c.get("name")
                    if isinstance(ctx, str) and ctx.strip():
                        required.add(ctx.strip())

required_list = sorted(required)

# Helper: normalize check rollup entry to (name, status, conclusion)
def norm_check(item):
    if not isinstance(item, dict):
        return None
    name = item.get("name") or item.get("context") or item.get("workflowName")
    status = item.get("status") or item.get("state")  # gh sometimes uses 'state'
    conclusion = item.get("conclusion")
    if isinstance(name, str):
        name = name.strip()
    if isinstance(status, str):
        status = status.strip().upper()
    if isinstance(conclusion, str):
        conclusion = conclusion.strip().upper()
    return (name, status, conclusion)

FAIL_CONCLUSIONS = {"FAILURE","CANCELLED","TIMED_OUT","ACTION_REQUIRED","STARTUP_FAILURE","STALE","ERROR"}
PASS_CONCLUSIONS = {"SUCCESS"}  # keep strict; we’ll report SKIPPED/NEUTRAL separately

rows = []
state_counts = Counter()
blocker_counts = Counter()

for pr in prs:
    if not isinstance(pr, dict):
        continue
    state_counts[pr.get("mergeStateStatus") or "UNKNOWN"] += 1

# Define “green-ish” and “stuck” heuristics
def pr_checks(pr):
    rollup = pr.get("statusCheckRollup") or []
    checks = []
    for item in rollup:
        t = norm_check(item)
        if t and t[0]:
            checks.append(t)
    return checks

def all_checks_success(pr):
    checks = pr_checks(pr)
    if not checks:
        return False
    # If any completed check run has a failure-ish conclusion, it’s not green
    for (name, status, conclusion) in checks:
        if conclusion in FAIL_CONCLUSIONS:
            return False
    # Require at least one SUCCESS conclusion somewhere
    return any((c in PASS_CONCLUSIONS) for (_,_,c) in checks)

def required_blockers(pr):
    checks = pr_checks(pr)
    by_name = defaultdict(list)
    for (name,status,conclusion) in checks:
        by_name[name].append((status,conclusion))

    missing = []
    failing = []
    incomplete = []
    non_success = []  # present but not SUCCESS
    for req in required_list:
        if req not in by_name:
            missing.append(req)
            continue
        # If any instance is completed with SUCCESS, treat as satisfied
        satisfied = any((concl in PASS_CONCLUSIONS) for (_,concl) in by_name[req])
        if satisfied:
            continue
        # otherwise classify
        # if any is not completed -> incomplete
        if any((st and st != "COMPLETED") for (st,concl) in by_name[req]):
            incomplete.append(req)
        # if completed but not success -> non_success
        if all((st == "COMPLETED") for (st,concl) in by_name[req]):
            non_success.append(req)
        # if any explicit failure-ish -> failing
        if any((concl in FAIL_CONCLUSIONS) for (st,concl) in by_name[req]):
            failing.append(req)

    return missing, failing, incomplete, non_success

green = []
stuck_green = []

for pr in prs:
    if not isinstance(pr, dict):
        continue
    if pr.get("isDraft"):
        continue
    if not all_checks_success(pr):
        continue

    green.append(pr)

    merge_state = pr.get("mergeStateStatus") or "UNKNOWN"
    # "CLEAN" usually means mergeable from checks perspective; still could be waiting if auto-merge not enabled.
    # We focus on those that are green but NOT CLEAN or otherwise blocked.
    if merge_state != "CLEAN":
        stuck_green.append(pr)

# Emit datasets
def pr_label_names(pr):
    labs = pr.get("labels") or []
    out = []
    for l in labs:
        if isinstance(l, dict) and isinstance(l.get("name"), str):
            out.append(l["name"])
    return out

out_json = []
for pr in stuck_green:
    missing, failing, incomplete, non_success = required_blockers(pr)
    review_decision = pr.get("reviewDecision")
    merge_state = pr.get("mergeStateStatus")
    mergeable = pr.get("mergeable")
    auto_merge = pr.get("autoMergeRequest")

    # basic blocker classification for summary tallies
    if missing: blocker_counts["missing_required_checks"] += 1
    if failing: blocker_counts["failing_required_checks"] += 1
    if incomplete: blocker_counts["incomplete_required_checks"] += 1
    if review_decision and str(review_decision).upper() not in ("APPROVED", "CHANGES_REQUESTED", "REVIEW_REQUIRED", "UNKNOWN"):
        blocker_counts[f"reviewDecision:{review_decision}"] += 1
    if review_decision and str(review_decision).upper() == "REVIEW_REQUIRED":
        blocker_counts["review_required"] += 1
    if merge_state:
        blocker_counts[f"mergeState:{merge_state}"] += 1

    out_json.append({
        "number": pr.get("number"),
        "title": pr.get("title"),
        "url": pr.get("url"),
        "updatedAt": pr.get("updatedAt"),
        "baseRefName": pr.get("baseRefName"),
        "headRefName": pr.get("headRefName"),
        "mergeable": mergeable,
        "mergeStateStatus": merge_state,
        "reviewDecision": review_decision,
        "autoMergeRequest": auto_merge,
        "labels": pr_label_names(pr),
        "required_missing": missing,
        "required_failing": failing,
        "required_incomplete": incomplete,
        "required_present_non_success": non_success,
    })

with open("stuck_green_prs.json", "w", encoding="utf-8") as f:
    json.dump(out_json, f, indent=2)

# CSV
csv_fields = [
    "number","mergeStateStatus","mergeable","reviewDecision","autoMergeEnabled",
    "missing_required_count","failing_required_count","incomplete_required_count",
    "title","url","updatedAt"
]
with open("stuck_green_prs.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=csv_fields)
    w.writeheader()
    for o in out_json:
        w.writerow({
            "number": o["number"],
            "mergeStateStatus": o["mergeStateStatus"],
            "mergeable": o["mergeable"],
            "reviewDecision": o["reviewDecision"],
            "autoMergeEnabled": bool(o["autoMergeRequest"]),
            "missing_required_count": len(o["required_missing"]),
            "failing_required_count": len(o["required_failing"]),
            "incomplete_required_count": len(o["required_incomplete"]),
            "title": o["title"],
            "url": o["url"],
            "updatedAt": o["updatedAt"],
        })

# Markdown summary for Jules
lines = []
lines.append("# Summit Merge Diagnostics — Green-but-Stuck PRs")
lines.append("")
lines.append(f"- Open PRs total: **{len(prs)}**")
lines.append(f"- PRs with no failing checks (green-ish): **{len(green)}**")
lines.append(f"- Green-but-stuck (mergeStateStatus != CLEAN): **{len(stuck_green)}**")
lines.append("")
lines.append("## MergeStateStatus distribution (all open PRs)")
for k,v in state_counts.most_common():
    lines.append(f"- {k}: {v}")
lines.append("")
lines.append("## Top blocker signals (among green-but-stuck)")
for k,v in blocker_counts.most_common():
    lines.append(f"- {k}: {v}")
lines.append("")
lines.append("## Required checks (branch protection)")
if required_list:
    lines.append(f"- Count: {len(required_list)}")
    for r in required_list[:60]:
        lines.append(f"  - {r}")
    if len(required_list) > 60:
        lines.append(f"  - ... (+{len(required_list)-60} more)")
else:
    lines.append("- (Could not extract required checks — check API permissions / endpoint results.)")
lines.append("")
lines.append("## Sample: first 25 green-but-stuck PRs")
lines.append("")
lines.append("| PR | mergeState | mergeable | reviewDecision | autoMerge | missing req | failing req | incomplete req |")
lines.append("|---:|---|---|---|---|---:|---:|---:|")
for o in out_json[:25]:
    lines.append(f"| [{o['number']}]({o['url']}) | {o['mergeStateStatus']} | {o['mergeable']} | {o['reviewDecision']} | {bool(o['autoMergeRequest'])} | {len(o['required_missing'])} | {len(o['required_failing'])} | {len(o['required_incomplete'])} |")

with open("stuck_green_prs.md", "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")

print("Wrote: stuck_green_prs.json, stuck_green_prs.csv, stuck_green_prs.md")
PY
