import os
import json
import pytest
from summit.benchmarks.spatialgeneval.runner import run_spatialgeneval, FLAG_NAME
from summit.benchmarks.spatialgeneval.io import QARecord

@pytest.fixture
def input_file(tmp_path):
    f = tmp_path / "input.jsonl"
    f.write_text(
        '{"question_id": "q1", "prompt_id": "p1", "question": "Q?", "choices": ["A", "B"], "answer_index": 0, "subdomain": "pos"}\n'
        '{"question_id": "q2_fail", "prompt_id": "p1", "question": "Q2?", "choices": ["A", "B"], "answer_index": 1, "subdomain": "vis"}\n'
    )
    return str(f)

def test_runner_disabled_by_default(input_file, tmp_path):
    # Ensure flag is OFF
    if FLAG_NAME in os.environ:
        del os.environ[FLAG_NAME]

    with pytest.raises(RuntimeError, match="not enabled"):
        run_spatialgeneval(input_file, str(tmp_path))

def test_runner_success(input_file, tmp_path):
    os.environ[FLAG_NAME] = "true"
    out_dir = tmp_path / "out"

    run_spatialgeneval(input_file, str(out_dir))

    assert (out_dir / "report.json").exists()
    assert (out_dir / "metrics.json").exists()
    assert (out_dir / "stamp.json").exists()

    metrics = json.loads((out_dir / "metrics.json").read_text())
    # Dummy judge predicts index 0.
    # q1: answer=0 -> Correct
    # q2: answer=1 -> Incorrect (Dummy predicts 0)
    # Accuracy = 0.5
    assert metrics["metrics"]["accuracy"] == 0.5
