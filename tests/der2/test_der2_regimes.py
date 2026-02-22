from pathlib import Path

from benchmarks.der2.regimes import (
    Der2Config,
    Regime,
    compile_instance,
    load_concepts,
    load_library,
    load_tasks,
)

FIXTURES_ROOT = Path("benchmarks/der2/fixtures")


def test_regime_prompt_compilation() -> None:
    library = load_library(FIXTURES_ROOT / "frozen_library")
    tasks = load_tasks(FIXTURES_ROOT / "tasks.jsonl")
    concepts = load_concepts(FIXTURES_ROOT / "concepts.jsonl")
    config = Der2Config(bench_id="test")

    task = tasks[0]

    instruction = compile_instance(task, Regime.INSTRUCTION_ONLY, library, concepts, config)
    assert instruction.evidence == []
    assert "Documents:" not in instruction.prompt

    concept = compile_instance(task, Regime.CONCEPTS, library, concepts, config)
    assert concept.concepts
    assert "Concepts:" in concept.prompt

    related = compile_instance(task, Regime.RELATED_ONLY, library, concepts, config)
    assert related.selected_doc_ids == list(task.related_doc_ids)

    full_set = compile_instance(task, Regime.FULL_SET, library, concepts, config)
    assert len(full_set.selected_doc_ids) >= len(task.related_doc_ids)
    assert "Documents:" in full_set.prompt
