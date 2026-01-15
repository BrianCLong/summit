#!/usr/bin/env python3
"""
Vulnerability Scanner Wrapper
Wraps Trivy/Snyk or falls back to npm audit.
"""

import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent


def run_npm_audit():
    print("Running npm audit...")
    try:
        # Run in server directory
        server_dir = ROOT / "server"
        if server_dir.exists():
            print("Scanning server dependencies...")
            subprocess.run(["npm", "audit", "--audit-level=high"], cwd=server_dir)

        # Run in client directory
        client_dir = ROOT / "client"
        if client_dir.exists():
            print("Scanning client dependencies...")
            subprocess.run(["npm", "audit", "--audit-level=high"], cwd=client_dir)

    except Exception as e:
        print(f"Error running npm audit: {e}")


def run_trivy():
    if not shutil.which("trivy"):
        print("Trivy not found. Skipping container scan.")
        return False

    print("Running Trivy filesystem scan...")
    subprocess.run(["trivy", "fs", ".", "--severity", "HIGH,CRITICAL"])
    return True


def main():
    print("Starting Vulnerability Scan...")

    # Try Trivy first
    ran_trivy = run_trivy()

    # Always run npm audit as it checks application deps
    run_npm_audit()

    print("Scan complete.")


if __name__ == "__main__":
    main()
