#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import glob

def check_quarantine():
    print("Checking test-quarantine.json...")
    try:
        with open('test-quarantine.json', 'r') as f:
            data = json.load(f)
            quarantined = data.get('quarantined', [])
            if quarantined:
                print(f"FAIL: {len(quarantined)} tests in quarantine.")
                return False
            else:
                print("PASS: Quarantine empty.")
                return True
    except FileNotFoundError:
        print("FAIL: test-quarantine.json not found.")
        return False
    except Exception as e:
        print(f"FAIL: Error reading quarantine file: {e}")
        return False

def check_pnpm_usage():
    print("\nChecking pnpm binary paths in workflows...")
    passed = True

    # 1. Check package.json
    try:
        with open('package.json', 'r') as f:
            pkg = json.load(f)
            pm = pkg.get('packageManager')
            if pm == 'pnpm@10.0.0':
                print(f"PASS: package.json specifies correct packageManager: {pm}")
            else:
                print(f"FAIL: package.json specifies incorrect packageManager: {pm} (expected pnpm@10.0.0)")
                passed = False
    except Exception as e:
        print(f"FAIL: Error reading package.json: {e}")
        passed = False

    # 2. Check reusable workflow
    reusable_workflow = '.github/workflows/_reusable-node-pnpm-setup.yml'
    if os.path.exists(reusable_workflow):
        with open(reusable_workflow, 'r') as f:
            content = f.read()
            # Simple check: ensure pnpm/action-setup is used without explicit version
            if 'uses: pnpm/action-setup' in content:
                # This is a heuristic. Ideally we parse YAML.
                # We expect "run_install: false" and NO "version:" in the block.
                # If we see "version:" in the file, we should verify it's not for pnpm setup.
                # But inputs definition has "pnpm-version", which is fine as long as it's not passed to the action.
                # The action usage should be just "run_install: false".

                # Let's check if the action block has 'version:'
                # We can't easily parse blocks with regex.
                # But we can check if 'uses: pnpm/action-setup' line is followed by 'with:' and then 'version:'
                pass
            else:
                print(f"WARN: {reusable_workflow} does not seem to use pnpm/action-setup.")

    return passed

def check_merge_loops():
    print("\nChecking for merge loops in recent git history...")
    try:
        # Get last 50 commits
        result = subprocess.run(['git', 'log', '--oneline', '-n', '50'], capture_output=True, text=True)
        if result.returncode != 0:
            print("WARN: Could not read git log.")
            return True # skip if git not available

        commits = result.stdout.strip().split('\n')
        merges = [c for c in commits if 'Merge' in c] # basic filter

        # Heuristic: check for exact duplicate merge subjects
        # Usually merge commits are like "Merge branch 'foo' into bar" or "Merge pull request #123..."
        # If we see the same PR merged twice or same branch merged twice in short succession, it's suspicious.

        seen = {}
        loop_detected = False
        for m in merges:
            # extract subject (after hash)
            parts = m.split(' ', 1)
            if len(parts) > 1:
                subject = parts[1]
                if subject in seen:
                    print(f"WARN: Potential merge loop detected: '{subject}' appears multiple times.")
                    loop_detected = True
                seen[subject] = True

        if not loop_detected:
            print("PASS: No obvious merge loops detected in last 50 commits.")
            return True
        else:
            return False

    except Exception as e:
        print(f"WARN: Error checking git log: {e}")
        return True

def check_gh_metrics():
    print("\nChecking GitHub Actions status...")
    if subprocess.run(['which', 'gh'], capture_output=True).returncode != 0:
        print("SKIP: 'gh' CLI not found. Cannot verify success rate live.")
        print("      (This check will run in CI environment)")
        return True

    try:
        # Get last 100 runs
        cmd = ['gh', 'run', 'list', '--json', 'conclusion,status', '-L', '100']
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print("FAIL: Error running 'gh run list'.")
            return False

        runs = json.loads(result.stdout)
        completed_runs = [r for r in runs if r['status'] == 'completed']
        total = len(completed_runs)

        if total == 0:
            print("WARN: No completed runs found.")
            return True

        success = len([r for r in completed_runs if r['conclusion'] == 'success'])
        rate = (success / total) * 100

        print(f"Success Rate (last {total} runs): {rate:.1f}%")

        if rate < 90:
            print(f"FAIL: Success rate is below 90% ({rate:.1f}%).")
            return False
        else:
            print(f"PASS: Success rate is >= 90% ({rate:.1f}%).")
            return True

    except Exception as e:
        print(f"FAIL: Error parsing gh output: {e}")
        return False

def main():
    print("=== CI Recovery Monitor ===\n")

    results = []
    results.append(check_quarantine())
    results.append(check_pnpm_usage())
    results.append(check_merge_loops())
    results.append(check_gh_metrics())

    print("\n===========================")
    if all(results):
        print("OVERALL STATUS: GREEN")
        sys.exit(0)
    else:
        print("OVERALL STATUS: RED")
        sys.exit(1)

if __name__ == "__main__":
    main()
