#!/usr/bin/env python3
"""
Reproducible Build Verifier
Detects non-deterministic build artifacts and outputs diffs.
"""

import argparse
import filecmp
import shutil
import subprocess
import sys
import os
import difflib
import hashlib
from pathlib import Path
from typing import List, Optional

def run_command(command: str, cwd: str = ".") -> int:
    """Run a shell command."""
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        if result.returncode != 0:
            print(f"Error running command: {command}")
            print(result.stderr.decode())
        return result.returncode
    except Exception as e:
        print(f"Exception running command: {e}")
        return 1

def hash_file(path: Path) -> str:
    """Compute SHA256 hash of a file."""
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            while chunk := f.read(8192):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return ""

def is_text_file(path: Path) -> bool:
    """Check if a file is text (heuristic)."""
    try:
        with open(path, "rb") as f:
            chunk = f.read(1024)
        return b"\0" not in chunk
    except Exception:
        return False

def compare_dirs(dir1: Path, dir2: Path, report_diffs: bool = True) -> int:
    """Compare two directories and report differences."""

    # Recursively get all files
    files1 = {str(p.relative_to(dir1)) for p in dir1.rglob("*") if p.is_file()}
    files2 = {str(p.relative_to(dir2)) for p in dir2.rglob("*") if p.is_file()}

    all_files = sorted(files1 | files2)
    mismatches = 0

    print("\n🔍 Comparing artifacts...")

    for f in all_files:
        p1 = dir1 / f
        p2 = dir2 / f

        if f not in files1:
            print(f"❌ {f}: Missing in build 1")
            mismatches += 1
            continue
        if f not in files2:
            print(f"❌ {f}: Missing in build 2")
            mismatches += 1
            continue

        h1 = hash_file(p1)
        h2 = hash_file(p2)

        if h1 != h2:
            print(f"❌ {f}: Hash mismatch")
            mismatches += 1

            if report_diffs and is_text_file(p1) and is_text_file(p2):
                try:
                    with open(p1, "r", errors="replace") as file1, \
                         open(p2, "r", errors="replace") as file2:
                        lines1 = file1.readlines()
                        lines2 = file2.readlines()

                        diff = difflib.unified_diff(
                            lines1, lines2,
                            fromfile=f"build1/{f}",
                            tofile=f"build2/{f}"
                        )
                        print("Diff:")
                        for line in diff:
                            print(line, end="")
                        print("\n" + "-"*40)
                except Exception as e:
                    print(f"Could not generate diff: {e}")
        else:
            # Verbose option could go here
            pass

    if mismatches == 0:
        print("✅ Builds are deterministic (identical artifacts).")
        return 0
    else:
        print(f"\nFound {mismatches} non-deterministic artifact(s).")
        return 1

def main():
    parser = argparse.ArgumentParser(description="Reproducible Build Verifier")
    parser.add_argument("--build-command", required=True, help="Command to run the build")
    parser.add_argument("--output-dir", required=True, help="Directory where artifacts are generated (relative to cwd)")
    parser.add_argument("--clean-command", help="Command to clean between builds", default=None)
    parser.add_argument("--work-dir", default=".", help="Working directory for the build")

    args = parser.parse_args()

    cwd = os.path.abspath(args.work_dir)
    out_dir_name = args.output_dir

    # Create temp dirs for comparison
    tmp_base = Path(cwd) / ".repro_verify_tmp"
    if tmp_base.exists():
        shutil.rmtree(tmp_base)
    tmp_base.mkdir()

    b1_dir = tmp_base / "b1"
    b2_dir = tmp_base / "b2"
    b1_dir.mkdir()
    b2_dir.mkdir()

    try:
        print(f"🚀 Starting verification for command: '{args.build_command}'")

        # Build 1
        print("\n🔨 Running Build 1...")
        if args.clean_command:
            run_command(args.clean_command, cwd)

        ret = run_command(args.build_command, cwd)
        if ret != 0:
            print("Build 1 failed.")
            sys.exit(1)

        # Copy artifacts
        src_out = Path(cwd) / out_dir_name
        if not src_out.exists():
            print(f"Output directory {src_out} does not exist after build.")
            sys.exit(1)

        shutil.copytree(src_out, b1_dir, dirs_exist_ok=True)

        # Build 2
        print("\n🔨 Running Build 2...")
        if args.clean_command:
            run_command(args.clean_command, cwd)
        else:
            # If no clean command, maybe we should delete the output dir to force rebuild?
            # But the user might rely on the build system's own clean.
            pass

        ret = run_command(args.build_command, cwd)
        if ret != 0:
            print("Build 2 failed.")
            sys.exit(1)

        # Copy artifacts
        if not src_out.exists():
             print(f"Output directory {src_out} does not exist after build 2.")
             sys.exit(1)

        shutil.copytree(src_out, b2_dir, dirs_exist_ok=True)

        # Compare
        ret = compare_dirs(b1_dir, b2_dir)
        sys.exit(ret)

    finally:
        # Cleanup
        if tmp_base.exists():
            shutil.rmtree(tmp_base)

if __name__ == "__main__":
    main()
