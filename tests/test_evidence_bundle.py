import tempfile
import shutil
import os
import json
from summit.evidence import write_bundle
from summit.evidence.verify import verify_bundle
import pytest

def test_determinism():
    ctx = {
        "evidence_id": "TEST-DET-1",
        "run_id": "RUN-1",
        "summary": "Summary",
        "policies_applied": ["P1"],
        "artifacts": ["A1"],
        "metrics": {"m1": 1}
    }

    dir1 = tempfile.mkdtemp()
    dir2 = tempfile.mkdtemp()

    try:
        write_bundle(ctx, dir1)
        write_bundle(ctx, dir2)

        files = ["report.json", "metrics.json", "evidence/index.json"]
        for f in files:
            p1 = os.path.join(dir1, f)
            p2 = os.path.join(dir2, f)

            with open(p1, "rb") as fh: c1 = fh.read()
            with open(p2, "rb") as fh: c2 = fh.read()

            assert c1 == c2, f"Content mismatch for {f}"
    finally:
        shutil.rmtree(dir1)
        shutil.rmtree(dir2)

def test_verifier_integration():
    ctx = {
        "evidence_id": "TEST-VERIFY-1",
        "run_id": "RUN-V1",
        "summary": "Verification Test",
        "policies_applied": ["P1"],
        "artifacts": ["A1"],
        "metrics": {"m1": 1}
    }

    tmp_dir = tempfile.mkdtemp()
    try:
        write_bundle(ctx, tmp_dir)
        verify_bundle(tmp_dir)
    finally:
        shutil.rmtree(tmp_dir)

def test_verifier_failure_tamper():
    ctx = {
        "evidence_id": "TEST-FAIL-1",
        "run_id": "RUN-F1",
        "summary": "Fail Test",
        "policies_applied": [],
        "artifacts": []
    }

    tmp_dir = tempfile.mkdtemp()
    try:
        write_bundle(ctx, tmp_dir)

        # Tamper report
        with open(os.path.join(tmp_dir, "report.json"), "a") as f:
            f.write(" ")

        try:
            verify_bundle(tmp_dir)
            assert False, "Should have failed"
        except RuntimeError as e:
            assert "Hash mismatch" in str(e)

    finally:
        shutil.rmtree(tmp_dir)
