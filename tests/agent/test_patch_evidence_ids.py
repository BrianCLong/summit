from agents.patch.engine import build_patch_stack


def test_patch_evidence_id_format() -> None:
    stack = build_patch_stack(
        run_id="r1",
        stage="patch",
        changes=[{"path": "a.py", "diff": "+line"}],
    )
    assert stack["patches"][0]["evidence_id"] == "EV-r1-patch-001"
