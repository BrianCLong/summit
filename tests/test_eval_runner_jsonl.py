import json

from intelgraph.eval import run_eval


def test_run_eval_jsonl(tmp_path):
    cases = [
        {"case_id": "1", "inputs": {"x": 1}, "y_true": 2},
        {"case_id": "2", "inputs": {"x": 2}, "y_true": 4},
    ]

    def predict(inputs):
        return inputs["x"] * 2

    out_file = tmp_path / "results.jsonl"
    run_eval("test_run", cases, predict, ["accuracy"], out_file)

    lines = out_file.read_text().splitlines()
    assert len(lines) == 2

    rec1 = json.loads(lines[0])
    assert rec1["case_id"] == "1"
    assert rec1["y_pred"] == 2
    assert rec1["metric_results"]["accuracy"] == 1.0
