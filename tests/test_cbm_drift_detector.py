import os
import subprocess
import tempfile

import pytest


def test_drift_detector_cli():
    with tempfile.NamedTemporaryFile(delete=False) as tmp_old:
        tmp_old.write(b"{}")
        old_path = tmp_old.name

    with tempfile.NamedTemporaryFile(delete=False) as tmp_new:
        tmp_new.write(b"{}")
        new_path = tmp_new.name

    with tempfile.NamedTemporaryFile(delete=False) as tmp_out:
        out_path = tmp_out.name

    try:
        subprocess.check_call(["python3", "scripts/monitoring/cbm_drift.py", "--old", old_path, "--new", new_path, "--out", out_path])
        assert os.path.exists(out_path)
        with open(out_path) as f:
            content = f.read()
            assert "drift_analyzed" in content
    finally:
        os.remove(old_path)
        os.remove(new_path)
        os.remove(out_path)
