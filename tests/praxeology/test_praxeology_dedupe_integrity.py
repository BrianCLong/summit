import pytest

def test_no_duplicates_leak_through_lanes():
    """Verify that no duplicate writes leak through trust lanes."""
    # Mock concurrent writesets from different lanes
    lane1_writes = [{"id": 1, "data": "A"}, {"id": 2, "data": "B"}]
    lane2_writes = [{"id": 1, "data": "A"}, {"id": 3, "data": "C"}]

    def process_writesets(*writesets):
        seen_ids = set()
        deduped = []
        for writeset in writesets:
            for write in writeset:
                if write["id"] not in seen_ids:
                    seen_ids.add(write["id"])
                    deduped.append(write)
        return deduped

    result = process_writesets(lane1_writes, lane2_writes)

    # Assert no duplicates
    ids = [w["id"] for w in result]
    assert len(ids) == len(set(ids))
    assert len(result) == 3
    assert {"id": 1, "data": "A"} in result
    assert {"id": 2, "data": "B"} in result
    assert {"id": 3, "data": "C"} in result

def test_dedupe_maintains_highest_trust_score():
    """Verify that when duplicates exist, the one from the higher trust lane is kept."""
    # Mock writes with trust scores
    writes = [
        {"id": 1, "data": "A", "trust_score": 80},
        {"id": 1, "data": "A", "trust_score": 95},
        {"id": 2, "data": "B", "trust_score": 90}
    ]

    def dedupe_with_trust(writes):
        best_writes = {}
        for write in writes:
            wid = write["id"]
            if wid not in best_writes or write["trust_score"] > best_writes[wid]["trust_score"]:
                best_writes[wid] = write
        return list(best_writes.values())

    result = dedupe_with_trust(writes)

    assert len(result) == 2
    # The write with id 1 should have the highest trust score (95)
    write_1 = next((w for w in result if w["id"] == 1), None)
    assert write_1 is not None
    assert write_1["trust_score"] == 95
