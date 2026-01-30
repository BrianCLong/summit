#!/usr/bin/env python3
"""
Merge Captain Branch Triage
Analyzes branches and categorizes them for cleanup
"""

import re
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path


def run_git_command(cmd):
    """Run a git command and return output"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running: {cmd}", file=sys.stderr)
        print(f"  {e.stderr}", file=sys.stderr)
        return None

def get_all_branches():
    """Get all remote branches except HEAD"""
    output = run_git_command("git branch -r")
    if not output:
        return []

    branches = []
    for line in output.split('\n'):
        line = line.strip()
        if 'HEAD' in line or not line:
            continue
        # Remove 'origin/' prefix
        branch = line.replace('origin/', '', 1)
        branches.append(branch)

    return branches

def get_branch_stats(branch):
    """Get behind/ahead stats for a branch"""
    cmd = f"git rev-list --left-right --count origin/main...origin/{branch}"
    output = run_git_command(cmd)

    if not output:
        return None, None

    try:
        behind, ahead = map(int, output.split())
        return behind, ahead
    except:
        return None, None

def get_last_commit_date(branch):
    """Get last commit date for a branch"""
    cmd = f"git log -1 --format='%ar' origin/{branch}"
    return run_git_command(cmd)

def main():
    print("🔍 Merge Captain: Branch Triage")
    print("=" * 50)
    print()

    # Create output directory
    output_dir = Path('.merge-captain')
    output_dir.mkdir(exist_ok=True)

    # Get all branches
    print("📥 Fetching branches...")
    run_git_command("git fetch origin --quiet")

    branches = get_all_branches()
    if 'main' in branches:
        branches.remove('main')

    print(f"📊 Analyzing {len(branches)} branches...")
    print()

    # Categories
    already_merged = []
    ancient = []
    stale_auto_remediation = []
    distant = []
    conflict_prone = []

    # Analyze each branch
    for i, branch in enumerate(branches, 1):
        if i % 50 == 0:
            print(f"  Progress: {i}/{len(branches)} branches analyzed...")

        behind, ahead = get_branch_stats(branch)

        if behind is None or ahead is None:
            continue

        last_commit = get_last_commit_date(branch)

        # Categorize
        if ahead == 0:
            already_merged.append((branch, behind, last_commit))
            print(f"  ✓ Already merged: {branch}")

        elif ahead > 7000:
            ancient.append((branch, behind, ahead, last_commit))
            print(f"  🚨 ANCIENT: {branch} ({ahead} commits ahead!)")

        elif branch.startswith('auto-remediation/state-update-'):
            # Check if old (before 2026-01-22)
            match = re.search(r'state-update-(\d{8})', branch)
            if match:
                date_str = match.group(1)
                branch_date = datetime.strptime(date_str, '%Y%m%d')
                cutoff_date = datetime(2026, 1, 22)
                if branch_date < cutoff_date:
                    stale_auto_remediation.append((branch, behind, last_commit))
                    print(f"  🧹 Stale auto-remediation: {branch}")

        elif behind > 150:
            distant.append((branch, behind, ahead, last_commit))

        elif behind > 100:
            conflict_prone.append((branch, behind, ahead, last_commit))

    print()
    print("=" * 50)
    print("📊 ANALYSIS RESULTS")
    print("=" * 50)
    print()
    print(f"✅ Already Merged (0 unique commits):    {len(already_merged):3d} branches")
    print(f"🚨 Ancient (7000+ commits ahead):        {len(ancient):3d} branches  DANGER!")
    print(f"🧹 Stale Auto-Remediation (old):         {len(stale_auto_remediation):3d} branches")
    print(f"📏 Distant (> 150 commits behind):       {len(distant):3d} branches")
    print(f"⚠️  Conflict-Prone (> 100 behind):        {len(conflict_prone):3d} branches")
    print()

    # Write results
    print("📁 Writing results...")

    # Already merged
    with open(output_dir / 'already-merged-branches.txt', 'w') as f:
        for branch, behind, last in already_merged:
            f.write(f"{branch}\n")

    # Ancient
    with open(output_dir / 'ancient-branches.txt', 'w') as f:
        for branch, behind, ahead, last in ancient:
            f.write(f"{branch} (behind: {behind}, ahead: {ahead}, last: {last})\n")

    # Stale auto-remediation
    with open(output_dir / 'stale-auto-remediation.txt', 'w') as f:
        for branch, behind, last in stale_auto_remediation:
            f.write(f"{branch} (behind: {behind})\n")

    # Distant
    with open(output_dir / 'distant-branches.txt', 'w') as f:
        for branch, behind, ahead, last in distant:
            f.write(f"{branch} (behind: {behind}, ahead: {ahead})\n")

    # Conflict prone
    with open(output_dir / 'conflict-prone-branches.txt', 'w') as f:
        for branch, behind, ahead, last in conflict_prone:
            f.write(f"{branch} (behind: {behind}, ahead: {ahead})\n")

    print(f"  ✓ Results saved to {output_dir}/")
    print()

    # Generate cleanup script
    cleanup_script = output_dir / 'cleanup-commands.sh'
    with open(cleanup_script, 'w') as f:
        f.write("#!/bin/bash\n")
        f.write("# Generated cleanup commands - REVIEW BEFORE EXECUTING\n\n")
        f.write("set -euo pipefail\n\n")

        # Ancient branches (PRIORITY 1)
        if ancient:
            f.write("# PRIORITY 1: Close ancient branches (catastrophic merge risk)\n")
            for branch, _, _, _ in ancient:
                f.write(f'echo "Closing ancient branch: {branch}"\n')
                f.write(f'gh pr close $(gh pr list --head "{branch}" --json number -q ".[0].number") \\\n')
                f.write('  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \\\n')
                f.write('  --delete-branch || true\n\n')

        # Already merged
        if already_merged:
            f.write("# Close already-merged branches\n")
            for branch, _, _ in already_merged:
                f.write(f'echo "Closing merged branch: {branch}"\n')
                f.write(f'gh pr close $(gh pr list --head "{branch}" --json number -q ".[0].number") \\\n')
                f.write('  --comment "Closing: Changes already merged into main" \\\n')
                f.write('  --delete-branch || true\n\n')

        # Stale auto-remediation
        if stale_auto_remediation:
            f.write("# Close stale auto-remediation branches\n")
            for branch, _, _ in stale_auto_remediation:
                f.write(f'echo "Closing stale auto-remediation: {branch}"\n')
                f.write(f'gh pr close $(gh pr list --head "{branch}" --json number -q ".[0].number") \\\n')
                f.write('  --comment "Superseded by newer state updates" \\\n')
                f.write('  --delete-branch || true\n\n')

    cleanup_script.chmod(0o755)
    print(f"🚀 Cleanup script generated: {cleanup_script}")
    print()

    # Summary
    total_cleanup = len(already_merged) + len(ancient) + len(stale_auto_remediation)

    if ancient:
        print("🚨 URGENT ACTION REQUIRED:")
        print(f"   {len(ancient)} ancient branches detected - catastrophic merge risk!")
        print(f"   Review: {output_dir}/ancient-branches.txt")
        print()

    if total_cleanup > 0:
        print(f"📈 Total cleanup potential: {total_cleanup} branches")
        print()
        print("Next steps:")
        print(f"  1. Review lists in {output_dir}/")
        print("  2. Install gh CLI if not available")
        print(f"  3. Run: {cleanup_script}")

    return 0

if __name__ == '__main__':
    sys.exit(main())
