from __future__ import annotations

import json
from pathlib import Path

from ppeg.diff_inspector import diff_provenance, render_diff_report


def test_diff_inspector_highlights_transform_changes(tmp_path: Path) -> None:
    before = [
        {
            "step_id": "source:sales_ledger",
            "outputs": {"sales_ledger": {"fingerprint": "aaa"}},
        },
        {
            "step_id": "compute_regional_totals",
            "outputs": {"regional_totals_stage": {"fingerprint": "bbb"}},
        },
    ]
    after = [
        {
            "step_id": "source:sales_ledger",
            "outputs": {"sales_ledger": {"fingerprint": "aaa"}},
        },
        {
            "step_id": "compute_regional_totals",
            "outputs": {"regional_totals_stage": {"fingerprint": "ccc"}},
        },
        {
            "step_id": "attach_policy_version",
            "outputs": {"regional_totals": {"fingerprint": "ddd"}},
        },
    ]

    before_path = tmp_path / "before.json"
    after_path = tmp_path / "after.json"
    before_path.write_text(json.dumps(before), encoding="utf-8")
    after_path.write_text(json.dumps(after), encoding="utf-8")

    diffs = diff_provenance(before_path, after_path)
    assert len(diffs) == 2
    assert {diff.step_id for diff in diffs} == {"compute_regional_totals", "attach_policy_version"}

    report = render_diff_report(diffs)
    assert "Detected transform changes" in report
    assert "compute_regional_totals" in report
