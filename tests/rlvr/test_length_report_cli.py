import json
import re
from pathlib import Path

import jsonschema

from summit.cli.rlvr_length_report import main

SCHEMA_DIR = Path("summit/evidence/schemas")
REPORT_SCHEMA = SCHEMA_DIR / "rlvr_length_report.schema.json"
METRICS_SCHEMA = SCHEMA_DIR / "rlvr_length_metrics.schema.json"
STAMP_SCHEMA = SCHEMA_DIR / "rlvr_length_stamp.schema.json"
FIXTURES = Path("tests/fixtures/luspo")


def _load_schema(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def test_length_report_cli_generates_deterministic_outputs(tmp_path: Path) -> None:
    input_path = FIXTURES / "length_report_input.jsonl"
    out_a = tmp_path / "run_a"
    out_b = tmp_path / "run_b"

    assert main(
        [
            "prog",
            "--in",
            str(input_path),
            "--out",
            str(out_a),
            "--window",
            "2",
            "--slope-threshold",
            "-0.05",
            "--drop-threshold",
            "0.2",
            "--max-len",
            "6",
            "--overlong-ratio-threshold",
            "0.2",
            "--hash-chain",
            "--redact",
            "--allow-extra",
        ]
    ) == 0

    assert main(
        [
            "prog",
            "--in",
            str(input_path),
            "--out",
            str(out_b),
            "--window",
            "2",
            "--slope-threshold",
            "-0.05",
            "--drop-threshold",
            "0.2",
            "--max-len",
            "6",
            "--overlong-ratio-threshold",
            "0.2",
            "--hash-chain",
            "--redact",
            "--allow-extra",
        ]
    ) == 0

    for filename in ["length_report.json", "metrics.json", "stamp.json"]:
        file_a = (out_a / filename).read_text(encoding="utf-8")
        file_b = (out_b / filename).read_text(encoding="utf-8")
        assert file_a == file_b
        assert "T" not in file_a

    report = json.loads((out_a / "length_report.json").read_text(encoding="utf-8"))
    metrics = json.loads((out_a / "metrics.json").read_text(encoding="utf-8"))
    stamp = json.loads((out_a / "stamp.json").read_text(encoding="utf-8"))

    jsonschema.validate(report, _load_schema(REPORT_SCHEMA))
    jsonschema.validate(metrics, _load_schema(METRICS_SCHEMA))
    jsonschema.validate(stamp, _load_schema(STAMP_SCHEMA))

    assert report["trend"]["collapse"] is True
    assert report["hash_chain"]["enabled"] is True
    assert re.match(r"^[a-f0-9]{64}$", report["hash_chain"]["final"])


def test_length_report_cli_rejects_invalid_jsonl(tmp_path: Path) -> None:
    bad_input = tmp_path / "bad.jsonl"
    bad_input.write_text("{not-json}\n", encoding="utf-8")
    out_dir = tmp_path / "out"

    assert (
        main(["prog", "--in", str(bad_input), "--out", str(out_dir)])
        == 1
    )


def test_length_report_cli_rejects_extra_fields_without_allow(tmp_path: Path) -> None:
    bad_input = tmp_path / "extra.jsonl"
    bad_input.write_text('{"response_len": 4, "prompt": "secret"}\n', encoding="utf-8")
    out_dir = tmp_path / "out"

    assert (
        main(["prog", "--in", str(bad_input), "--out", str(out_dir)])
        == 1
    )


def test_length_report_cli_flags_overlong_growth(tmp_path: Path) -> None:
    input_path = FIXTURES / "abuse_cases" / "padding_growth.jsonl"
    out_dir = tmp_path / "out"

    assert (
        main(
            [
                "prog",
                "--in",
                str(input_path),
                "--out",
                str(out_dir),
                "--max-len",
                "20",
                "--overlong-ratio-threshold",
                "0.2",
            ]
        )
        == 0
    )

    report = json.loads((out_dir / "length_report.json").read_text(encoding="utf-8"))
    assert report["policy"]["overlong_flag"] is True
