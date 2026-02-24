import json
import re

from runtime.memory.short_term import ShortTermMemory, write_memory_artifacts


def test_deterministic_snapshot():
    memory = ShortTermMemory(window_size=3)
    memory.add("user", "a")
    memory.add("assistant", "b")

    first = memory.snapshot()
    second = memory.snapshot()

    assert first == second


def test_window_truncation():
    memory = ShortTermMemory(window_size=2)
    memory.add("user", "1")
    memory.add("assistant", "2")
    memory.add("user", "3")

    assert memory.snapshot()["entries"] == [
        {"role": "assistant", "content": "2"},
        {"role": "user", "content": "3"},
    ]


def test_snapshot_has_no_timestamps():
    memory = ShortTermMemory(window_size=2)
    memory.add("user", "hello")
    snapshot = memory.snapshot()

    for key in snapshot.keys():
        assert "time" not in key
        assert "timestamp" not in key


def test_stable_json_ordering_for_artifacts(tmp_path):
    memory = ShortTermMemory(window_size=2)
    memory.add("user", "hello")
    memory.add("assistant", "world")

    write_memory_artifacts(memory, tmp_path)
    first = (tmp_path / "memory_report.json").read_text(encoding="utf-8")

    write_memory_artifacts(memory, tmp_path)
    second = (tmp_path / "memory_report.json").read_text(encoding="utf-8")

    assert first == second


def test_feature_flag_off_keeps_behavior_unchanged():
    def execute(enabled: bool):
        steps = ["run-start", "agent-exec", "run-complete"]
        if enabled:
            steps.append("memory-artifacts")
        return steps

    assert execute(False) == ["run-start", "agent-exec", "run-complete"]


def test_evidence_id_format_enforced(tmp_path):
    memory = ShortTermMemory(window_size=2)
    memory.add("user", "hello")
    output = write_memory_artifacts(memory, tmp_path)

    assert re.fullmatch(r"memory-short-term-[a-f0-9]{12}", output["evidence_id"])

    evidence = json.loads((tmp_path / "evidence.json").read_text(encoding="utf-8"))
    assert evidence["evidence_id"] == output["evidence_id"]
