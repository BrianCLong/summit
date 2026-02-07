from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Callable, Sequence

from .regimes import (
    CompiledInstance,
    Concepts,
    Der2Config,
    Library,
    Regime,
    TaskInstance,
    compile_instance,
    ensure_env_guard,
    iter_regimes,
    load_concepts,
    load_library,
    load_tasks,
)


@dataclass(frozen=True)
class Der2Result:
    compiled: CompiledInstance
    output: str
    expected_answer: str | None
    is_correct: bool


def _hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _hash_json(data: object) -> str:
    encoded = json.dumps(data, sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _dummy_model(_prompt: str) -> str:
    return "DUMMY_RESPONSE"


def _default_model(_model_name: str) -> Callable[[str], str]:
    return _dummy_model


def _evaluate_answer(output: str, expected: str | None) -> bool:
    if expected is None:
        return False
    return output.strip().lower() == expected.strip().lower()


def _collect_results(
    tasks: Sequence[TaskInstance],
    library: Library,
    concepts_map: dict[str, Concepts],
    regimes: Sequence[Regime],
    config: Der2Config,
    model: Callable[[str], str],
) -> list[Der2Result]:
    results: list[Der2Result] = []
    for task in tasks:
        for regime in regimes:
            compiled = compile_instance(task, regime, library, concepts_map, config)
            output = model(compiled.prompt)
            is_correct = _evaluate_answer(output, task.expected_answer)
            results.append(
                Der2Result(
                    compiled=compiled,
                    output=output,
                    expected_answer=task.expected_answer,
                    is_correct=is_correct,
                )
            )
    return results


def _accuracy_for(results: Sequence[Der2Result], regime: Regime) -> float:
    filtered = [result for result in results if result.compiled.regime is regime]
    if not filtered:
        return 0.0
    correct = sum(1 for result in filtered if result.is_correct)
    return correct / len(filtered)


def _build_error_attribution(results: Sequence[Der2Result]) -> list[dict[str, object]]:
    by_task: dict[str, dict[Regime, Der2Result]] = {}
    for result in results:
        by_task.setdefault(result.compiled.task_id, {})[result.compiled.regime] = result

    attributions: list[dict[str, object]] = []
    for task_id, regime_map in by_task.items():
        instruction = regime_map.get(Regime.INSTRUCTION_ONLY)
        full_set = regime_map.get(Regime.FULL_SET)
        concepts = regime_map.get(Regime.CONCEPTS)
        related = regime_map.get(Regime.RELATED_ONLY)
        mode_switch_fragility = False
        structural_concept_misuse = False
        if instruction and full_set:
            mode_switch_fragility = instruction.is_correct and not full_set.is_correct
        if concepts and related:
            structural_concept_misuse = related.is_correct and not concepts.is_correct

        attributions.append(
            {
                "task_id": task_id,
                "mode_switch_fragility": mode_switch_fragility,
                "structural_concept_misuse": structural_concept_misuse,
            }
        )
    return attributions


def run_der2(
    *,
    bench_id: str,
    frozen_library_dir: str | Path,
    tasks_path: str | Path,
    concepts_path: str | Path,
    output_dir: str | Path,
    model_name: str = "dummy",
    regimes: Sequence[str] = ("instruction_only", "concepts", "related_only", "full_set"),
    distractor_count: int = 2,
    deterministic: bool = True,
    validation_mode: bool = False,
) -> dict[str, Path]:
    ensure_env_guard(True)
    config = Der2Config(bench_id=bench_id, distractor_count=distractor_count)
    library = load_library(frozen_library_dir)
    tasks = load_tasks(tasks_path)
    concepts_map = load_concepts(concepts_path)
    active_regimes = iter_regimes(regimes)

    model = _default_model(model_name)
    results = _collect_results(tasks, library, concepts_map, active_regimes, config, model)

    metrics = {
        "bench_id": bench_id,
        "model": model_name,
        "deterministic": deterministic,
        "accuracy": {
            regime.value: _accuracy_for(results, regime) for regime in active_regimes
        },
    }
    metrics["regime_gap"] = {
        "full_set_minus_instruction_only": metrics["accuracy"].get("full_set", 0.0)
        - metrics["accuracy"].get("instruction_only", 0.0),
        "concepts_minus_instruction_only": metrics["accuracy"].get("concepts", 0.0)
        - metrics["accuracy"].get("instruction_only", 0.0),
        "related_only_minus_instruction_only": metrics["accuracy"].get("related_only", 0.0)
        - metrics["accuracy"].get("instruction_only", 0.0),
    }

    leakage_flags: list[dict[str, object]] = []
    if validation_mode:
        for result in results:
            if result.compiled.regime is not Regime.INSTRUCTION_ONLY:
                continue
            novelty_required = next(
                task.novelty_required for task in tasks if task.task_id == result.compiled.task_id
            )
            if novelty_required and result.is_correct:
                leakage_flags.append({"task_id": result.compiled.task_id, "leakage": True})

    report_entries = []
    for result in results:
        report_entries.append(
            {
                "task_id": result.compiled.task_id,
                "regime": result.compiled.regime.value,
                "prompt": result.compiled.prompt,
                "selected_doc_ids": list(result.compiled.selected_doc_ids),
                "concepts": list(result.compiled.concepts),
                "evidence": [asdict(item) for item in result.compiled.evidence],
                "output": result.output,
                "expected_answer": result.expected_answer,
                "is_correct": result.is_correct,
            }
        )

    stamp = {
        "bench_id": bench_id,
        "model": model_name,
        "deterministic": deterministic,
        "regimes": [regime.value for regime in active_regimes],
        "inputs": {
            "tasks_hash": _hash_file(Path(tasks_path)),
            "concepts_hash": _hash_file(Path(concepts_path)),
            "library_hash": _hash_file(Path(frozen_library_dir) / "documents.jsonl"),
        },
        "config_hash": _hash_json({"distractor_count": distractor_count}),
    }

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / "report.json"
    metrics_path = output_dir / "metrics.json"
    stamp_path = output_dir / "stamp.json"
    error_path = output_dir / "error_attribution.json"

    report_path.write_text(json.dumps(report_entries, indent=2, sort_keys=True) + "\n")
    metrics_path.write_text(json.dumps(metrics, indent=2, sort_keys=True) + "\n")
    stamp_path.write_text(json.dumps(stamp, indent=2, sort_keys=True) + "\n")
    error_path.write_text(
        json.dumps(
            {
                "bench_id": bench_id,
                "attribution": _build_error_attribution(results),
                "leakage_flags": leakage_flags,
            },
            indent=2,
            sort_keys=True,
        )
        + "\n"
    )

    return {
        "report": report_path,
        "metrics": metrics_path,
        "stamp": stamp_path,
        "error_attribution": error_path,
    }
