from agents.patcher.git_interface import FilePatch
from agents.patcher.patch_engine import DeterministicPatchEngine


def test_patch_generation_is_deterministic() -> None:
    engine = DeterministicPatchEngine()
    stack = engine.build_patch_stack(
        [
            FilePatch(target_file="b.txt", diff="+b"),
            FilePatch(target_file="a.txt", diff="+a"),
        ],
        run_id="R204",
    )

    assert stack[0]["target_file"] == "a.txt"
    assert stack[0]["evidence_id"] == "EV-R204-PATCH-001"
    assert stack[1]["evidence_id"] == "EV-R204-PATCH-002"
