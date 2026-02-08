from pathlib import Path

import pytest

from summit.cli.rlvr_length_report import main

FIXTURES = Path("tests/fixtures/luspo")


@pytest.mark.perf
def test_length_report_perf_output(tmp_path: Path) -> None:
    input_path = FIXTURES / "length_report_input.jsonl"
    out_dir = tmp_path / "out"
    perf_path = tmp_path / "perf.json"

    assert (
        main(
            [
                "prog",
                "--in",
                str(input_path),
                "--out",
                str(out_dir),
                "--perf-out",
                str(perf_path),
            ]
        )
        == 0
    )

    perf_text = perf_path.read_text(encoding="utf-8")
    assert "input_bytes" in perf_text
    assert "runtime_ms" in perf_text
    assert "peak_rss_mb" in perf_text
