from evals.runner import evaluate


def test_eval_threshold_gate() -> None:
    report = evaluate([0.9, 1.0, 0.8], threshold=0.8)
    assert report["pass"] is True
    assert report["average"] >= 0.8
