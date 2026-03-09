import pytest
from pathlib import Path
from benchmarks.spatialgeneval.io import load_prompt_bundle
from benchmarks.spatialgeneval.judge.base import DummyJudge
from benchmarks.spatialgeneval.runner import run_eval, aggregate_scores

def test_score_aggregation():
    results = [
        {"pred_index": 0, "answer_index": 0, "subdomain": "sd1"},
        {"pred_index": 1, "answer_index": 0, "subdomain": "sd1"},
        {"pred_index": 0, "answer_index": 0, "subdomain": "sd2"},
    ]
    metrics = aggregate_scores(results)
    assert metrics["overall_accuracy"] == pytest.approx(2/3)
    assert metrics["correct_count"] == 2
    assert metrics["total_count"] == 3
    assert metrics["accuracy_by_subdomain"]["sd1"] == 0.5
    assert metrics["accuracy_by_subdomain"]["sd2"] == 1.0

def test_eval_runner(tmp_path):
    # Setup
    fixtures_dir = Path("tests/fixtures/spatialgeneval")
    data_file = fixtures_dir / "minimal_prompt_qa.jsonl"
    bundle = load_prompt_bundle(data_file)

    # Create dummy images
    images_dir = tmp_path / "images"
    images_dir.mkdir()
    (images_dir / "P001.png").touch()
    (images_dir / "P002.png").touch()

    judge = DummyJudge()
    results = run_eval(bundle, images_dir, judge)

    assert len(results) == 2
    metrics = aggregate_scores(results)
    # Dummy judge always picks index 0. In our fixture, answer_index is 0 for both.
    assert metrics["overall_accuracy"] == 1.0
