from libs.evidence.eid import compute_eid

def test_compute_eid_deterministic():
    eid1 = compute_eid("constraint_schema", "abcdef012345", {"a": 1, "b": [2,3]}, {"x": "y"})
    eid2 = compute_eid("constraint_schema", "abcdef012345", {"b": [2,3], "a": 1}, {"x": "y"})
    assert str(eid1) == str(eid2)
    assert str(eid1).startswith("eid.summit.constraint_schema.abcdef01.")
