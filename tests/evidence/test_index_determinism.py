from evidence.index import build_index


def test_build_index_sorts_by_evidence_id() -> None:
    items = [
        {"evidence_id": "EVD-2", "paths": {"report": "r2", "metrics": "m2", "stamp": "s2"}},
        {"evidence_id": "EVD-1", "paths": {"report": "r1", "metrics": "m1", "stamp": "s1"}}
    ]

    index = build_index(items)
    evidence_ids = [item["evidence_id"] for item in index["items"]]

    assert evidence_ids == ["EVD-1", "EVD-2"]
