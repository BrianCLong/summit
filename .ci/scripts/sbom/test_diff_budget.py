import datetime as dt
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from diff_budget import (  # noqa: E402
    count_by_severity,
    delta_counts,
    evaluate,
    filter_exceptions,
    load_exceptions,
)


def write_exception_file(path: Path, data: dict) -> Path:
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


def test_filter_exceptions_removes_accepted_ids():
    vulns = [
        {"id": "CVE-1", "severity": "high"},
        {"id": "CVE-2", "severity": "medium"},
    ]
    filtered = filter_exceptions(vulns, {"CVE-1"})
    assert filtered == [{"id": "CVE-2", "severity": "medium"}]


def test_evaluate_blocks_new_critical():
    ok, errors = evaluate({"critical": 1, "high": 0, "medium": 0, "low": 0, "unknown": 0}, {})
    assert not ok
    assert any("Blocking" in err for err in errors)


def test_load_exceptions_validates_ticket_and_fields(tmp_path: Path):
    sha = "abc123"
    expiry = (dt.datetime.now(dt.UTC) + dt.timedelta(days=10)).isoformat()
    exceptions_dir = tmp_path
    write_exception_file(
        exceptions_dir / f"{sha}.json",
        {
            "signed": True,
            "exceptions": [
                {
                    "vulnId": "CVE-VALID",
                    "justification": "Risk accepted",
                    "ticket": "https://tracker/SEC-1",
                    "expiry": expiry,
                    "approvals": {"security": "alice", "platform": "bob"},
                },
                {
                    "vulnId": "CVE-BAD",
                    "justification": "Missing URL",
                    "ticket": "ftp://tracker/SEC-2",
                    "expiry": expiry,
                    "approvals": {"security": "alice", "platform": "bob"},
                },
            ],
        },
    )

    accepted, alerts = load_exceptions(exceptions_dir, sha, alert_window_days=7)

    assert accepted == {"CVE-VALID"}
    assert any("Invalid ticket URL" in alert for alert in alerts)


def test_load_exceptions_emits_expiry_alert(tmp_path: Path):
    sha = "abc123"
    expiry = (dt.datetime.now(dt.UTC) + dt.timedelta(days=1)).isoformat()
    exceptions_dir = tmp_path
    write_exception_file(
        exceptions_dir / f"{sha}.json",
        {
            "signed": True,
            "exceptions": [
                {
                    "vulnId": "CVE-SOON",
                    "justification": "Short lived",
                    "ticket": "https://tracker/SEC-3",
                    "expiry": expiry,
                    "approvals": {"security": "alice", "platform": "bob"},
                }
            ],
        },
    )

    accepted, alerts = load_exceptions(exceptions_dir, sha, alert_window_days=7)

    assert accepted == {"CVE-SOON"}
    assert any("expires on" in alert for alert in alerts)


def test_count_and_delta_by_severity():
    baseline = count_by_severity([{"severity": "high"}])
    current = count_by_severity(
        [
            {"severity": "high"},
            {"severity": "critical"},
        ]
    )

    deltas = delta_counts(current, baseline)

    assert deltas["critical"] == 1
    assert deltas["high"] == 0
