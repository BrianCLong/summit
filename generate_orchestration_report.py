import json
import os
import subprocess
from datetime import datetime, timezone
import shlex

def run_cmd(cmd):
    try:
        if isinstance(cmd, str):
            cmd = shlex.split(cmd)
        return subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL).strip()
    except Exception as e:
        return ""

def get_prs():
    # Attempt to list open PRs and their branches
    # Fallback to local branches if github cli not available
    out = run_cmd("gh pr list --state open --json title,headRefName,url")
    if out:
        try:
            return json.loads(out)
        except:
            pass

    # Fallback: Just look at local remote branches and treat them as PR proxies
    branches = run_cmd("git branch -r")
    pr_list = []
    for branch in branches.split('\n'):
        branch = branch.strip()
        if branch and not branch.startswith('origin/HEAD'):
            pr_list.append({"headRefName": branch, "title": branch})
    return pr_list

def generate_report():
    sessions = ["monitoring", "benchmark_expansion", "adapters", "leaderboard", "research"]

    prs = get_prs()

    active_sessions_data = []

    for session in sessions:
        # Check scope drift: e.g. a PR that touches files outside its core domain
        # Check duplicate PRs: Multiple PRs for the same session topic
        session_prs = []
        for pr in prs:
            title = pr.get("title", "").lower()
            branch = pr.get("headRefName", "").lower()
            if session.replace('_', ' ') in title or session.replace('_', '-') in branch or session in branch:
                session_prs.append(pr)

        duplicate_prs = max(0, len(session_prs) - 1) if len(session_prs) > 0 else 0

        # Heuristic for scope drift: We can check if `git log` or `git diff` for those branches touches
        # many unrelated directories. For now, we'll keep it simple or set to False unless we find evidence.
        scope_drift = False
        if len(session_prs) > 0:
            for pr in session_prs:
                branch = pr["headRefName"]
                # Get files changed in this branch relative to main
                # Since branch might be like origin/jules-research-123
                cmd = ["git", "diff", "--name-only", f"origin/main...{branch}"]
                files_changed = run_cmd(cmd)
                # simple heuristic: if a research PR touches 'adapters', that's drift
                if session == "research" and "adapters/" in files_changed:
                    scope_drift = True
                if session == "adapters" and "research/" in files_changed:
                    scope_drift = True


        active_sessions_data.append({
            "type": session,
            "status": "active" if len(session_prs) > 0 else "inactive",
            "scope_drift": scope_drift,
            "duplicate_prs": duplicate_prs
        })

    # Detect deterministic artifact violations across sessions.
    # We can verify that JSON artifacts in `artifacts/` are strictly sorted
    # and deterministically formatted.
    deterministic_artifact_violations = 0
    artifacts_dir = "artifacts"

    # Also find all json files in artifacts/
    json_files = []
    for root, dirs, files in os.walk(artifacts_dir):
        for f in files:
            if f.endswith('.json') and f != 'jules-orchestration-report.json':
                json_files.append(os.path.join(root, f))

    for filepath in json_files:
        try:
            with open(filepath, 'r') as file:
                content = file.read()
                data = json.loads(content)

                def check_sorted_keys(d):
                    if isinstance(d, dict):
                        keys = list(d.keys())
                        if keys != sorted(keys):
                            return False
                        for v in d.values():
                            if not check_sorted_keys(v):
                                return False
                    elif isinstance(d, list):
                        for item in d:
                            if not check_sorted_keys(item):
                                return False
                    return True

                if not check_sorted_keys(data):
                    deterministic_artifact_violations += 1
        except json.JSONDecodeError:
            deterministic_artifact_violations += 1

    summary_msg = "Daily orchestration run completed successfully."
    if deterministic_artifact_violations > 0:
        summary_msg += f" Detected {deterministic_artifact_violations} artifact violations."

    has_drift = any(s["scope_drift"] for s in active_sessions_data)
    has_dupes = any(s["duplicate_prs"] > 0 for s in active_sessions_data)

    if has_drift:
        summary_msg += " Scope drift detected."
    if has_dupes:
        summary_msg += " Duplicate PRs detected."

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        "role": "Summit Orchestration Supervisor",
        "monitoring": {
            "active_sessions": active_sessions_data,
            "deterministic_artifact_violations": deterministic_artifact_violations
        },
        "summary": summary_msg.strip()
    }

    os.makedirs('artifacts', exist_ok=True)
    with open('artifacts/jules-orchestration-report.json', 'w') as f:
        json.dump(report, f, indent=2, sort_keys=True)
        f.write('\n')

if __name__ == "__main__":
    generate_report()
