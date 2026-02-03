#!/usr/bin/env python3
from __future__ import annotations

import filecmp
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run_generators(output_root: Path) -> int:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT)
    env["SUMMIT_GENERATED_ROOT"] = str(output_root)
    env["SUMMIT_EXPERIMENTAL_CODEDATA"] = "1"

    return subprocess.call(
        [sys.executable, "-m", "codegen.generators.all"],
        cwd=ROOT,
        env=env
    )


def main() -> int:
    print("Running determinism smoke test...")

    with tempfile.TemporaryDirectory() as tmp1, tempfile.TemporaryDirectory() as tmp2:
        path1 = Path(tmp1)
        path2 = Path(tmp2)

        rc = run_generators(path1)
        if rc != 0:
            print("ERROR: Run 1 failed")
            return rc

        rc = run_generators(path2)
        if rc != 0:
            print("ERROR: Run 2 failed")
            return rc

        gen1 = path1 / "generated"
        gen2 = path2 / "generated"

        if not gen1.exists() or not gen2.exists():
            print("ERROR: 'generated' directory was not produced.")
            return 1

        dircmp = filecmp.dircmp(gen1, gen2)

        def check_diffs(dcmp: filecmp.dircmp) -> bool:
            if dcmp.left_only or dcmp.right_only or dcmp.diff_files:
                return True
            for sub_dcmp in dcmp.subdirs.values():
                if check_diffs(sub_dcmp):
                    return True
            return False

        if check_diffs(dircmp):
            print("ERROR: Nondeterminism detected!")
            return 1

        print("SUCCESS: Determinism smoke test passed.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
