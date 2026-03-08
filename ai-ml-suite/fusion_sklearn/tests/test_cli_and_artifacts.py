import json

from summit_fusion.cli import main


def test_cli_generates_artifacts(monkeypatch, tmp_path):
    golden_path = tmp_path / "fusion_demo.jsonl"
    with open(golden_path, "w") as f:
        f.write('{"text": "A test sentence.", "label": 1}\n')
        f.write('{"text": "Another test sentence.", "label": 0}\n')
        f.write('{"text": "A third test sentence.", "label": 1}\n')
        f.write('{"text": "A fourth test sentence.", "label": 0}\n')
        f.write('{"text": "A fifth test sentence.", "label": 1}\n')
        f.write('{"text": "A sixth test sentence.", "label": 0}\n')

    out_dir = tmp_path / "artifacts"

    # Mock CLI arguments
    monkeypatch.setattr("sys.argv", ["cli.py", "run", "--golden", str(golden_path), "--out", str(out_dir)])

    # Run CLI
    import summit_fusion.cli
    summit_fusion.cli.main()

    # Verify artifacts
    assert (out_dir / "report.json").exists()
    assert (out_dir / "metrics.json").exists()
    assert (out_dir / "stamp.json").exists()

    # Verify no raw text in artifacts
    with open(out_dir / "report.json") as f:
        report = f.read()
        assert "A test sentence." not in report

    with open(out_dir / "metrics.json") as f:
        metrics = json.load(f)
        assert "accuracy" in metrics

    with open(out_dir / "stamp.json") as f:
        stamp = json.load(f)
        assert "evidence_id" in stamp
        assert stamp["evidence_id"].startswith("EV:FUSION:")
