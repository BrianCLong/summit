from pathlib import Path

from benchmarks.der2.regimes import Der2Config, Regime, compile_instance, load_concepts, load_library, load_tasks

FIXTURES_ROOT = Path("benchmarks/der2/fixtures")


def test_deterministic_distractor_selection() -> None:
    library = load_library(FIXTURES_ROOT / "frozen_library")
    tasks = load_tasks(FIXTURES_ROOT / "tasks.jsonl")
    concepts = load_concepts(FIXTURES_ROOT / "concepts.jsonl")

    config = Der2Config(bench_id="deterministic", distractor_count=2)
    task = tasks[0]

    first = compile_instance(task, Regime.FULL_SET, library, concepts, config)
    second = compile_instance(task, Regime.FULL_SET, library, concepts, config)

    assert first.selected_doc_ids == second.selected_doc_ids
