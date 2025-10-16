from ml.ttp_train import compute_delta, load_corrections


def test_load_corrections(tmp_path) -> None:
    data_text = '[{"id": 1}]'
    p = tmp_path / "corr.json"
    p.write_text(data_text)
    out = load_corrections(p)
    assert out == [{"id": 1}]


def test_compute_delta() -> None:
    prev = [{"id": 1}]
    curr = prev + [{"id": 2}]
    assert compute_delta(prev, curr) == 1
