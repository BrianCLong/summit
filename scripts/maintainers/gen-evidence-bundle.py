#!/usr/bin/env python3
"""
Evidence Bundle Generator for Summit PRs and Releases.
Produces a deterministic bundle directory with manifest, diff, diffstat, and tree listing.
"""

import argparse
import json
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path


def run_git(args):
    """Run a git command and return the output as a string."""
    try:
        result = subprocess.run(
            ["git"] + args,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        # Don't exit on all errors, some commands are expected to fail in some envs
        raise e

def main():
    parser = argparse.ArgumentParser(description="Generate a Summit Evidence Bundle.")
    parser.add_argument("--out", type=str, help="Output directory for the bundle.")
    parser.add_argument("--base", type=str, help="Base reference for the diff (default: origin/main or merge-base).")
    parser.add_argument("--no-timestamp", action="store_true", help="Omit timestamp from manifest for full determinism.")
    parser.add_argument("--risk", type=str, default="unknown", help="Risk level (low, medium, high, unknown).")
    parser.add_argument("--checks", type=str, help="Comma-separated list of checks run.")
    parser.add_argument("--prompts", type=str, help="Comma-separated list of prompt hashes/IDs.")

    args = parser.parse_args()

    # 1. Determine Git Metadata
    head_sha = run_git(["rev-parse", "HEAD"])

    base_ref = args.base
    if not base_ref:
        # Strategy: try origin/main, then main, then HEAD~1
        for candidate in ["origin/main", "main"]:
            try:
                base_ref = run_git(["merge-base", candidate, "HEAD"])
                break
            except:
                continue
        if not base_ref:
            try:
                base_ref = run_git(["rev-parse", "HEAD~1"])
            except:
                base_ref = head_sha # No parent

    # 2. Collect Artifacts
    diff_patch = run_git(["diff", base_ref, "HEAD"])
    diff_stat = run_git(["diff", "--stat", base_ref, "HEAD"])
    # One-line summary of diffstat
    try:
        diff_stat_summary = run_git(["diff", "--shortstat", base_ref, "HEAD"])
    except:
        diff_stat_summary = "0 files changed"

    changed_files_raw = run_git(["diff", "--name-only", base_ref, "HEAD"])
    changed_files = changed_files_raw.splitlines() if changed_files_raw else []
    changed_files.sort()

    # Deterministic tree listing
    tree_listing = run_git(["ls-tree", "-r", "--name-only", "HEAD"])

    # 3. Prepare Manifest
    manifest = {
        "commit_sha": head_sha,
        "base_ref": base_ref,
        "changed_files": changed_files,
        "diffstat_summary": diff_stat_summary,
        "risk_level": args.risk,
        "checks_run": sorted([c.strip() for c in args.checks.split(",")]) if args.checks else [],
        "prompt_hashes": sorted([p.strip() for p in args.prompts.split(",")]) if args.prompts else []
    }

    if not args.no_timestamp:
        # Use a stable format for ISO8601
        try:
            from datetime import timezone
            manifest["timestamp"] = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
        except ImportError:
            # Fallback for older python
            manifest["timestamp"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # 4. Write to Output Directory
    out_path_str = args.out if args.out else f"evidence/bundles/{head_sha[:7]}"
    out_dir = Path(out_path_str)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Use sort_keys=True for determinism
    with open(out_dir / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)
        f.write("\n") # Ensure trailing newline

    with open(out_dir / "diff.patch", "w") as f:
        f.write(diff_patch)
        if diff_patch: f.write("\n")

    with open(out_dir / "diffstat.txt", "w") as f:
        f.write(diff_stat)
        if diff_stat: f.write("\n")

    with open(out_dir / "tree.txt", "w") as f:
        f.write(tree_listing)
        if tree_listing: f.write("\n")

    print(f"✅ Evidence bundle generated at: {out_dir}")

if __name__ == "__main__":
    main()
