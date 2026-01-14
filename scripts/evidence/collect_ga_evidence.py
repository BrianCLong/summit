#!/usr/bin/env python3
import os
import sys
import json
import shutil
import hashlib
import time
import subprocess
from pathlib import Path
from datetime import datetime

# --- Configuration ---
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DIST_DIR = ROOT_DIR / "dist"
EVIDENCE_BASE = DIST_DIR / "evidence"
ARTIFACTS_DIR = ROOT_DIR / "artifacts"
GA_ARTIFACTS = ARTIFACTS_DIR / "ga"

def get_git_info():
    try:
        sha = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
        branch = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], text=True).strip()
        return sha, branch
    except:
        return "unknown", "unknown"

def calculate_sha256(file_path):
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def normalize_filename(name):
    return name.lower().replace(" ", "_")

def main():
    print("📦 Collecting GA Evidence...")

    sha, branch = get_git_info()
    timestamp = datetime.utcnow().isoformat() + "Z"

    # Evidence Directory: dist/evidence/<sha>
    evidence_dir = EVIDENCE_BASE / sha
    if evidence_dir.exists():
        shutil.rmtree(evidence_dir)
    evidence_dir.mkdir(parents=True, exist_ok=True)

    # --- 1. Collect Logs & Reports ---
    logs_dir = evidence_dir / "logs"
    logs_dir.mkdir(exist_ok=True)

    if (GA_ARTIFACTS / "ga_report.json").exists():
        shutil.copy(GA_ARTIFACTS / "ga_report.json", logs_dir / "ga_report.json")
    if (GA_ARTIFACTS / "ga_report.md").exists():
        shutil.copy(GA_ARTIFACTS / "ga_report.md", logs_dir / "ga_report.md")

    # --- 2. Collect Tests ---
    tests_dir = evidence_dir / "tests"
    tests_dir.mkdir(exist_ok=True)

    # Unit Tests (Jest JUnit)
    # Server
    if (ROOT_DIR / "server/junit.xml").exists():
        (tests_dir / "unit" / "server").mkdir(parents=True, exist_ok=True)
        shutil.copy(ROOT_DIR / "server/junit.xml", tests_dir / "unit" / "server" / "junit.xml")

    # Client
    if (ROOT_DIR / "client/junit.xml").exists():
        (tests_dir / "unit" / "client").mkdir(parents=True, exist_ok=True)
        shutil.copy(ROOT_DIR / "client/junit.xml", tests_dir / "unit" / "client" / "junit.xml")

    # Root JUnit (from ci check)
    if (ROOT_DIR / "junit.xml").exists():
         (tests_dir / "unit" / "root").mkdir(parents=True, exist_ok=True)
         shutil.copy(ROOT_DIR / "junit.xml", tests_dir / "unit" / "root" / "junit.xml")

    # Coverage
    if (ROOT_DIR / "coverage").exists():
        shutil.copytree(ROOT_DIR / "coverage", tests_dir / "coverage", dirs_exist_ok=True)
    if (ROOT_DIR / "server/coverage").exists():
         shutil.copytree(ROOT_DIR / "server/coverage", tests_dir / "coverage/server", dirs_exist_ok=True)


    # --- 3. Collect Security ---
    security_dir = evidence_dir / "security"
    security_dir.mkdir(exist_ok=True)

    # SBOM
    sbom_dir = evidence_dir / "sbom"
    sbom_dir.mkdir(exist_ok=True)
    if (ROOT_DIR / "sbom.json").exists():
        shutil.copy(ROOT_DIR / "sbom.json", sbom_dir / "sbom.cdx.json")

    # Audit (npm/pnpm audit)
    # Run pnpm audit and save output if not already there
    try:
        audit_output = subprocess.check_output(["pnpm", "audit", "--json"], text=True)
        with open(security_dir / "pnpm-audit.json", "w") as f:
            f.write(audit_output)
    except subprocess.CalledProcessError as e:
        # pnpm audit exits with non-zero if vulnerabilities found, but we still want the report
        with open(security_dir / "pnpm-audit.json", "w") as f:
            f.write(e.output)
    except Exception as e:
        print(f"⚠️ Could not run pnpm audit: {e}")

    # --- 4. Build Metadata ---
    build_dir = evidence_dir / "build"
    build_dir.mkdir(exist_ok=True)

    with open(build_dir / "build-metadata.txt", "w") as f:
        f.write(f"Timestamp: {timestamp}\n")
        f.write(f"Git SHA: {sha}\n")
        f.write(f"Git Branch: {branch}\n")
        try:
            f.write("Node Version: " + subprocess.check_output(["node", "-v"], text=True))
            f.write("PNPM Version: " + subprocess.check_output(["pnpm", "-v"], text=True))
        except:
            pass

    # --- 5. Generate Checksums ---
    checksums = {}
    print("  Calculating checksums...")
    for path in evidence_dir.rglob("*"):
        if path.is_file() and path.name != "checksums.sha256":
            rel_path = path.relative_to(evidence_dir)
            checksums[str(rel_path)] = calculate_sha256(path)

    with open(evidence_dir / "checksums.sha256", "w") as f:
        for path, hash_val in sorted(checksums.items()):
            f.write(f"{hash_val}  {path}\n")

    # --- 6. Generate Meta.json ---
    meta = {
        "repo": "summit", # Hardcoded or derived
        "git": {
            "sha": sha,
            "branch": branch
        },
        "build": {
            "timestamp": timestamp,
            "ci_run_id": os.environ.get("GITHUB_RUN_ID"),
            "ci_run_url": f"{os.environ.get('GITHUB_SERVER_URL')}/{os.environ.get('GITHUB_REPOSITORY')}/actions/runs/{os.environ.get('GITHUB_RUN_ID')}" if os.environ.get("GITHUB_RUN_ID") else None
        },
        "contents": {
            "tests": os.path.exists(tests_dir),
            "security": os.path.exists(security_dir),
            "sbom": os.path.exists(sbom_dir),
            "logs": os.path.exists(logs_dir)
        }
    }

    # Add summary from ga_report.json if available
    if (logs_dir / "ga_report.json").exists():
        try:
            with open(logs_dir / "ga_report.json") as f:
                ga_report = json.load(f)
                meta["ga_report"] = ga_report
        except:
            pass

    with open(evidence_dir / "meta.json", "w") as f:
        json.dump(meta, f, indent=2)

    # --- 7. Generate EVIDENCE_SUMMARY.md ---
    with open(evidence_dir / "EVIDENCE_SUMMARY.md", "w") as f:
        f.write(f"# GA Evidence Summary\n\n")
        f.write(f"**Commit:** `{sha}`\n")
        f.write(f"**Branch:** `{branch}`\n")
        f.write(f"**Date:** {timestamp}\n")

        if "ga_report" in meta:
            f.write(f"\n## GA Gate Results\n")
            checks = meta["ga_report"].get("checks", [])
            f.write("| Check | Status | Duration |\n")
            f.write("|-------|--------|----------|\n")
            for check in checks:
                status_icon = "✅" if check.get("status") == "PASS" else "❌"
                f.write(f"| {check.get('name')} | {status_icon} {check.get('status')} | {check.get('duration_seconds')}s |\n")

        f.write("\n## Artifacts\n")
        f.write(f"- **Tests:** {'✅ Included' if meta['contents']['tests'] else '❌ Missing'}\n")
        f.write(f"- **Security:** {'✅ Included' if meta['contents']['security'] else '❌ Missing'}\n")
        f.write(f"- **SBOM:** {'✅ Included' if meta['contents']['sbom'] else '❌ Missing'}\n")

        f.write("\n## Verification\n")
        f.write("Run `sha256sum -c checksums.sha256` to verify integrity.\n")

    # --- 8. Package Tarball ---
    tarball_name = f"evidence-{sha}.tar.gz"
    tarball_path = DIST_DIR / tarball_name

    print(f"  Packaging {tarball_name}...")
    subprocess.run(["tar", "-czf", str(tarball_path), "-C", str(DIST_DIR), f"evidence/{sha}"], check=True)

    print(f"\n✅ Evidence collected at: {evidence_dir}")
    print(f"📦 Tarball created: {tarball_path}")

if __name__ == "__main__":
    main()
