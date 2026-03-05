import re
from pathlib import Path

RFC3339 = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z")
EPOCH = re.compile(r"\b1[6-9]\d{9}\b")


def test_no_timestamp_like_values_in_mws_outputs():
    for path in sorted(Path("artifacts/runs").glob("EVID-CASE-0001-*/*.json")):
        content = path.read_text(encoding="utf-8")
        assert RFC3339.search(content) is None
        assert EPOCH.search(content) is None
