import hashlib
import json
import shutil
from pathlib import Path

from src.workflows.runner import run_workflow


def _digest_dir(path: Path) -> str:
    digest = hashlib.sha256()
    for file in sorted(path.glob("*.json")):
        digest.update(file.name.encode("utf-8"))
        digest.update(file.read_bytes())
    return digest.hexdigest()


def test_workflow_is_byte_identical_across_runs(tmp_path):
    del tmp_path
    input_payload = json.loads(Path("fixtures/mws_case1/input.json").read_text(encoding="utf-8"))
    run_workflow("examples/bellingcat_mws.yaml", input_payload)
    evid_dir = next(Path("artifacts/runs").glob("EVID-CASE-0001-*"))
    first = _digest_dir(evid_dir)

    shutil.rmtree(evid_dir)
    run_workflow("examples/bellingcat_mws.yaml", input_payload)
    evid_dir2 = next(Path("artifacts/runs").glob("EVID-CASE-0001-*"))
    second = _digest_dir(evid_dir2)
    assert first == second
