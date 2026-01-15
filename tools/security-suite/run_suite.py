#!/usr/bin/env python3
"""
Master Security Suite Runner
Runs all security tools and aggregates results.
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
SUITE_DIR = ROOT / "tools" / "security-suite"


def run_tool(script_name):
    script_path = SUITE_DIR / script_name
    print(f"\n=== Running {script_name} ===")
    try:
        subprocess.run([sys.executable, str(script_path)], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running {script_name}: {e}")
        return False
    return True


def main():
    print("Starting Summit Security Suite...")

    tools = [
        "stride_modeler.py",
        "data_flow_gen.py",
        "security_scorecard.py",
        "checklist_gen.py",
        "vuln_scanner.py",
    ]

    success = True
    for tool in tools:
        if not run_tool(tool):
            success = False

    print("\n=== Suite Complete ===")
    if success:
        print("All tools executed successfully.")
    else:
        print("Some tools failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
