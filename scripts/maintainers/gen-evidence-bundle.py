#!/usr/bin/env python3
"""
Summit Evidence Bundle Generator
Generates deterministic evidence bundles from the git working tree.
"""
import argparse
import json
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path


def run_git(args):
    try:
        result = subprocess.run(['git'] + args, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running git {' '.join(args)}: {e.stderr}", file=sys.stderr)
        sys.exit(1)

def get_merge_base(base, head):
    try:
        # Try to find merge base to get a cleaner diff
        return run_git(['merge-base', base, head])
    except:
        return base

def main():
    parser = argparse.ArgumentParser(description="Generate a Summit Evidence Bundle")
    parser.add_argument("--out", required=True, help="Output directory for the bundle")
    parser.add_argument("--base", default="origin/main", help="Base reference for the diff (default: origin/main)")
    parser.add_argument("--no-timestamp", action="store_true", help="Disable timestamp in manifest (for deterministic testing)")

    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    head_sha = run_git(['rev-parse', 'HEAD'])
    merge_base = get_merge_base(args.base, 'HEAD')

    # 1. Get Changed Files (including uncommitted changes)
    changed_files_raw = run_git(['diff', '--name-only', merge_base])
    changed_files = sorted(changed_files_raw.splitlines()) if changed_files_raw else []

    # Filter out output directory from changed_files if it's inside the repo
    try:
        rel_out = out_dir.resolve().relative_to(Path.cwd().resolve())
        changed_files = [f for f in changed_files if not f.startswith(str(rel_out))]
    except ValueError:
        # out_dir is not under current directory
        pass

    # 2. Get Diffstat Summary
    diffstat_summary = run_git(['diff', '--shortstat', merge_base])
    insertions = 0
    deletions = 0
    files_changed = 0

    if diffstat_summary:
        parts = [p.strip() for p in diffstat_summary.split(',')]
        for part in parts:
            if 'file' in part:
                files_changed = int(part.split()[0])
            elif 'insertion' in part:
                insertions = int(part.split()[0])
            elif 'deletion' in part:
                deletions = int(part.split()[0])

    # 3. Generate diff.patch
    diff_patch = run_git(['diff', merge_base])
    with open(out_dir / "diff.patch", "w") as f:
        f.write(diff_patch)

    # 4. Generate diffstat.txt
    diffstat_full = run_git(['diff', '--stat', merge_base])
    with open(out_dir / "diffstat.txt", "w") as f:
        f.write(diffstat_full)

    # 5. Generate tree.txt (list of changed files)
    with open(out_dir / "tree.txt", "w") as f:
        f.write("\n".join(changed_files))

    # 6. Generate manifest.json
    # Use timezone-aware UTC datetime
    try:
        from datetime import timezone
        now = datetime.now(UTC)
    except ImportError:
        now = datetime.utcnow()

    manifest = {
        "timestamp": now.strftime("%Y-%m-%dT%H:%M:%SZ") if not args.no_timestamp else "0000-00-00T00:00:00Z",
        "commit_sha": head_sha,
        "base_ref": args.base,
        "merge_base": merge_base,
        "changed_files": changed_files,
        "diffstat": {
            "files_changed": files_changed,
            "insertions": insertions,
            "deletions": deletions
        },
        "prompt_hashes": [],
        "risk_level": "unknown",
        "checks_run": []
    }

    with open(out_dir / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)

    print(f"✅ Evidence bundle generated in {out_dir}")

if __name__ == "__main__":
    main()
