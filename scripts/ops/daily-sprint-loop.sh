#!/usr/bin/env bash
set -euo pipefail

DATE_INPUT="${1:-}"
if [[ -n "$DATE_INPUT" ]]; then
  RUN_DATE="$DATE_INPUT"
else
  RUN_DATE="$(date -u +%F)"
fi

EVIDENCE_ROOT="docs/ops/evidence/daily-sprint-${RUN_DATE}"
REPORT_PATH="docs/ops/DAILY_SPRINT_${RUN_DATE}.md"
mkdir -p "$EVIDENCE_ROOT"

PR_JSON="$EVIDENCE_ROOT/pr_list.json"
PR_ERR="$EVIDENCE_ROOT/pr_list.err"
ISSUE_JSON="$EVIDENCE_ROOT/issue_list.json"
ISSUE_ERR="$EVIDENCE_ROOT/issue_list.err"
PR_TOP_MD="$EVIDENCE_ROOT/pr_top20.md"
ISSUE_TOP_MD="$EVIDENCE_ROOT/issue_top20.md"

: > "$PR_JSON"
: > "$PR_ERR"
: > "$ISSUE_JSON"
: > "$ISSUE_ERR"
: > "$PR_TOP_MD"
: > "$ISSUE_TOP_MD"

GH_RETRIES="${GH_RETRIES:-3}"
GH_TIMEOUT_SECONDS="${GH_TIMEOUT_SECONDS:-20}"

run_gh_capture() {
  local out_file="$1"
  local err_file="$2"
  shift 2
  local attempt=1

  : > "$out_file"
  : > "$err_file"

  while [[ "$attempt" -le "$GH_RETRIES" ]]; do
    if python3 - "$out_file" "$err_file" "$GH_TIMEOUT_SECONDS" "$@" <<'PY'
import subprocess
import sys
from pathlib import Path

out_file = Path(sys.argv[1])
err_file = Path(sys.argv[2])
timeout_s = int(sys.argv[3])
cmd = sys.argv[4:]

try:
    cp = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_s)
    out_file.write_text(cp.stdout)
    err_file.write_text(cp.stderr)
    raise SystemExit(cp.returncode)
except subprocess.TimeoutExpired as exc:
    out_file.write_text((exc.stdout or "") if isinstance(exc.stdout, str) else "")
    timeout_msg = f"command timed out after {timeout_s}s: {' '.join(cmd)}\n"
    stderr_text = (exc.stderr or "") if isinstance(exc.stderr, str) else ""
    err_file.write_text(timeout_msg + stderr_text)
    raise SystemExit(124)
PY
    then
      return 0
    fi
    {
      echo ""
      echo "[attempt ${attempt}/${GH_RETRIES}] command failed: $*"
    } >>"$err_file"
    attempt=$((attempt + 1))
    sleep 1
  done

  return 1
}

if command -v gh >/dev/null 2>&1; then
  run_gh_capture "$PR_JSON" "$PR_ERR" \
    gh pr list --repo BrianCLong/summit --state open --limit 100 \
    --json number,title,updatedAt,url,labels,headRefName,author,isDraft || true
  run_gh_capture "$ISSUE_JSON" "$ISSUE_ERR" \
    gh issue list --repo BrianCLong/summit --state open --limit 200 \
    --json number,title,updatedAt,url,labels,author || true
else
  echo "gh CLI unavailable in runtime" >"$PR_ERR"
  echo "gh CLI unavailable in runtime" >"$ISSUE_ERR"
fi

RUN_DATE_ENV="$RUN_DATE" EVIDENCE_ROOT_ENV="$EVIDENCE_ROOT" python3 - <<'PY'
import hashlib
import json
import os
import re
from pathlib import Path

run_date = os.environ["RUN_DATE_ENV"]
base = Path(os.environ["EVIDENCE_ROOT_ENV"])

pr_err = (base / "pr_list.err").read_text().strip()
issue_err = (base / "issue_list.err").read_text().strip()

try:
    prs = json.loads((base / "pr_list.json").read_text().strip() or "[]")
except Exception:
    prs = []

try:
    issues = json.loads((base / "issue_list.json").read_text().strip() or "[]")
except Exception:
    issues = []

priority_terms = [
    ("security", 100),
    ("critical", 90),
    ("ga", 80),
    ("readiness", 70),
    ("governance", 70),
    ("ci", 60),
    ("performance", 50),
    ("perf", 50),
]
issue_label_re = re.compile(r"security|ga|governance|osint|bolt|readiness", re.IGNORECASE)

def compute_priority(item):
    title = (item.get("title") or "").lower()
    labels = " ".join((label.get("name") or "").lower() for label in item.get("labels") or [])
    score = 0
    for term, weight in priority_terms:
        if term in title or term in labels:
            score += weight
    return score

def sort_key(item):
    return (-compute_priority(item), -(1 if item.get("updatedAt") else 0), item.get("updatedAt") or "", item.get("number") or 0)

priority_prs = sorted(prs, key=sort_key)[:20]
priority_issues = sorted(
    [
        issue
        for issue in issues
        if issue_label_re.search((issue.get("title") or "") + " " + " ".join((label.get("name") or "") for label in issue.get("labels") or []))
    ],
    key=sort_key,
)[:20]

def render_md(rows, path, kind):
    lines = ["| Priority | Number | Title | Updated | URL |", "|---|---:|---|---|---|"]
    for row in rows:
        priority = compute_priority(row)
        number = row.get("number", "")
        title = (row.get("title") or "").replace("|", "\\|")
        updated_at = row.get("updatedAt") or ""
        url = row.get("url") or ""
        lines.append(f"| {priority} | #{number} | {title} | {updated_at} | {url} |")
    if len(lines) == 2:
        lines.append(f"| 0 | n/a | No {kind} available | n/a | n/a |")
    path.write_text("\n".join(lines) + "\n")

render_md(priority_prs, base / "pr_top20.md", "PRs")
render_md(priority_issues, base / "issue_top20.md", "issues")

report = {
    "scope": "daily-sprint",
    "date": run_date,
    "evidence": {
        "pr_list": {"count": len(prs), "error": pr_err or None},
        "issue_list": {"count": len(issues), "error": issue_err or None},
        "pr_top20": {"count": len(priority_prs)},
        "issue_top20": {"count": len(priority_issues)},
    },
    "top_prs": [{"number": p.get("number"), "title": p.get("title"), "url": p.get("url")} for p in priority_prs[:6]],
    "top_issues": [{"number": i.get("number"), "title": i.get("title"), "url": i.get("url")} for i in priority_issues[:6]],
    "notes": [
        "Daily sprint evidence generated by scripts/ops/daily-sprint-loop.sh.",
        "PRs and issues are prioritized by security/GA/governance/CI/performance indicators.",
        "If GitHub triage is unavailable, see pr_list.err and issue_list.err.",
    ],
}

metrics = {
    "pr_count": len(prs),
    "issue_count": len(issues),
    "pr_top20_count": len(priority_prs),
    "issue_top20_count": len(priority_issues),
    "pr_error": bool(report["evidence"]["pr_list"]["error"]),
    "issue_error": bool(report["evidence"]["issue_list"]["error"]),
}

(base / "report.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
(base / "metrics.json").write_text(json.dumps(metrics, indent=2, sort_keys=True) + "\n")

h = hashlib.sha256()
for name in [
    "report.json",
    "metrics.json",
    "pr_list.json",
    "pr_list.err",
    "issue_list.json",
    "issue_list.err",
    "pr_top20.md",
    "issue_top20.md",
]:
    h.update((base / name).read_bytes())
(base / "stamp.json").write_text(
    json.dumps({"hash": h.hexdigest(), "provenance": "daily-sprint"}, indent=2, sort_keys=True) + "\n"
)

def markdown_tasks():
    tasks = []
    for pr in priority_prs[:3]:
        n = pr.get("number")
        title = pr.get("title") or "Untitled PR"
        tasks.append(
            f"1. Review and advance PR #{n} ({title}).\n"
            "   - Goal: converge highest-priority open PR toward merge-ready status.\n"
            "   - Scope: branch linked to this PR, CI workflow files, and touched subsystem files only.\n"
            "   - Validation: scoped tests + `node scripts/check-boundaries.cjs` for changed files."
        )
    tasks.append(
        "1. Validate deterministic evidence artifacts for daily sprint telemetry.\n"
        "   - Goal: keep report/metrics/stamp outputs reproducible and complete.\n"
        "   - Scope: `scripts/ops/daily-sprint-loop.sh`, `docs/ops/evidence/daily-sprint-*`.\n"
        "   - Validation: rerun this script and confirm stable schema + hash regeneration."
    )
    tasks.append(
        "1. Resolve or document GitHub connectivity blockers with concrete retry evidence.\n"
        "   - Goal: ensure triage failures are explicit, reproducible, and actionable.\n"
        "   - Scope: `pr_list.err`, `issue_list.err`, and sprint blocker log.\n"
        "   - Validation: `gh pr list`/`gh issue list` success, or captured terminal errors."
    )
    tasks.append(
        "1. Prepare PR-ready sprint evidence updates for reviewer handoff.\n"
        "   - Goal: keep daily sprint artifacts merge-ready even when external APIs fail.\n"
        "   - Scope: `docs/ops/DAILY_SPRINT_*.md` and `docs/ops/evidence/daily-sprint-*`.\n"
        "   - Validation: `git diff -- docs/ops scripts/ops` shows coherent, minimal changes."
    )
    return "\n".join(tasks[:6])

tasks_md = markdown_tasks()
top_pr_section = "\n".join(
    f"- #{p.get('number')}: {p.get('title')} ({p.get('url')})" for p in priority_prs[:6]
) or "- None (triage unavailable)"
top_issue_section = "\n".join(
    f"- #{i.get('number')}: {i.get('title')} ({i.get('url')})" for i in priority_issues[:6]
) or "- None or unavailable"

(base / "report_sections.md").write_text(
    "\n".join(
        [
            "## Prioritized PRs (Top 6)",
            top_pr_section,
            "",
            "## Prioritized Issues (Top 6)",
            top_issue_section,
            "",
            "## Sprint Plan (3-6 tasks)",
            tasks_md,
            "",
        ]
    )
    + "\n"
)
PY

REPORT_SECTIONS_PATH="$EVIDENCE_ROOT/report_sections.md"
REPORT_SECTIONS_CONTENT="$(cat "$REPORT_SECTIONS_PATH")"

cat > "$REPORT_PATH" <<MD
# Daily Sprint — ${RUN_DATE}

Mode: Sensing

## Evidence Bundle

- Evidence root: \`${EVIDENCE_ROOT}\`
- report.json, metrics.json, stamp.json
- Raw logs: pr_list.err, issue_list.err
- Priority views: pr_top20.md, issue_top20.md

${REPORT_SECTIONS_CONTENT}

## Execution Log

- Evidence generated by scripts/ops/daily-sprint-loop.sh for ${RUN_DATE}.
- PR triage count is recorded in report.json.
- Issue triage count is recorded in report.json.

## Blockers

- See report.json and *.err files for current execution constraints.

## MAESTRO Alignment

- MAESTRO Layers: Agents, Tools, Observability, Security.
- Threats Considered: tool abuse, prompt injection, evidence tampering.
- Mitigations: deterministic hash stamp; explicit failure capture; evidence-first outputs.

## End-of-Day Report

- Completed: deterministic evidence bundle generated.
- In progress: triage execution pending runtime connectivity and tooling availability.
- Blocked: deferred pending explicit errors captured in evidence logs.
MD

echo "Daily sprint bundle written: $EVIDENCE_ROOT"
echo "Daily sprint report written: $REPORT_PATH"
