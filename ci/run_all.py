import subprocess
import sys

SCRIPTS = [
    "ci/check_evidence_index.py",
    "ci/check_policy_classification.py",
    "ci/check_concept_completeness.py"
]

def run_script(script):
    print(f"Running {script}...")
    try:
        subprocess.run([sys.executable, script], check=True)
        print(f"PASS: {script}")
        return True
    except subprocess.CalledProcessError:
        print(f"FAIL: {script}")
        return False

def main():
    failed = False
    for s in SCRIPTS:
        if not run_script(s):
            failed = True

    if failed:
        sys.exit(1)
    else:
        print("All checks passed.")

if __name__ == "__main__":
    main()
