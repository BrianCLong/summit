"""Core primitives for the Pipeline Flakiness Detector (PFD)."""
from __future__ import annotations

import dataclasses
import hashlib
import inspect
import json
import math
import random
import statistics
import time
from collections import Counter
from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional, Sequence

try:  # Optional numpy support for better numeric handling.
    import numpy as _np  # type: ignore
except Exception:  # pragma: no cover - numpy is optional.
    _np = None


@dataclass(frozen=True)
class PipelineStep:
    """Represents a named unit of computation within a pipeline."""

    name: str
    func: Callable[[Any], Any]


@dataclass(frozen=True)
class StepRun:
    """Captures the outcome of a step for a single pipeline run."""

    step_name: str
    value_repr: str
    value_hash: str
    numeric_vector: Optional[List[float]]
    exception: Optional[str] = None
    skipped: bool = False


@dataclass(frozen=True)
class StepAnalysis:
    """Aggregate metrics for a pipeline step across multiple runs."""

    name: str
    flakiness_score: float
    difference_ratio: float
    failure_ratio: float
    normalized_variance: float
    mean: Optional[float]
    variance: Optional[float]
    num_runs: int
    failures: int
    unique_value_samples: List[Mapping[str, Any]]
    flagged: bool
    blame_file: Optional[str]
    blame_line: Optional[int]
    exceptions: List[str]


def _seed_environment(base_seed: int, run_id: int) -> None:
    """Best-effort seeding of common PRNGs for reproducibility."""

    seed = (base_seed + run_id * 9973) & 0xFFFFFFFF
    random.seed(seed)
    try:
        import numpy as np  # type: ignore

        np.random.seed(seed % (2**32 - 1))
    except Exception:  # pragma: no cover - numpy optional.
        pass
    try:
        import torch  # type: ignore

        torch.manual_seed(seed)
        if torch.cuda.is_available():  # type: ignore[attr-defined]
            torch.cuda.manual_seed_all(seed)  # pragma: no cover - GPU not in CI.
    except Exception:  # pragma: no cover - torch optional.
        pass


def _stable_default(obj: Any) -> str:
    """Fallback serializer returning a deterministic representation."""

    if dataclasses.is_dataclass(obj):
        return json.dumps(
            {field.name: getattr(obj, field.name) for field in dataclasses.fields(obj)},
            sort_keys=True,
            default=_stable_default,
        )
    if isinstance(obj, set):
        return json.dumps(sorted(list(obj)), sort_keys=True, default=_stable_default)
    return repr(obj)


def _stable_serialize(value: Any) -> str:
    """Serialize a value into a deterministic string suitable for hashing."""

    try:
        return json.dumps(value, sort_keys=True, default=_stable_default)
    except TypeError:
        return repr(value)


def _stable_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", "replace")).hexdigest()


def _is_bool(value: Any) -> bool:
    return isinstance(value, bool)


def _extract_numeric_vector(value: Any) -> Optional[List[float]]:
    """Attempt to flatten a value into a list of floats for statistics."""

    if _is_bool(value):
        return [1.0 if value else 0.0]
    if isinstance(value, (int, float)):
        return [float(value)]
    if _np is not None and isinstance(value, _np.ndarray):  # pragma: no cover - numpy optional
        try:
            return _np.asarray(value, dtype=float).ravel().tolist()
        except Exception:
            return None
    if isinstance(value, Mapping):
        flattened: List[float] = []
        for key in sorted(value.keys(), key=str):
            component = _extract_numeric_vector(value[key])
            if component is None:
                return None
            flattened.extend(component)
        return flattened
    if isinstance(value, (list, tuple)):
        flattened_list: List[float] = []
        for item in value:
            component = _extract_numeric_vector(item)
            if component is None:
                return None
            flattened_list.extend(component)
        return flattened_list
    return None


def _compute_statistics(vectors: Iterable[Optional[List[float]]]) -> Mapping[str, Optional[float]]:
    values: List[float] = []
    for vector in vectors:
        if vector is None:
            continue
        values.extend(vector)
    if not values:
        return {"mean": None, "variance": None, "normalized_variance": 0.0}
    if len(values) == 1:
        return {"mean": values[0], "variance": 0.0, "normalized_variance": 0.0}
    mean = statistics.fmean(values)
    variance = statistics.pvariance(values, mu=mean)
    std = math.sqrt(variance)
    denom = abs(mean) + std + 1e-9
    normalized_variance = std / denom
    return {"mean": mean, "variance": variance, "normalized_variance": normalized_variance}


class PipelineFlakinessDetector:
    """Executes a pipeline repeatedly to surface non-deterministic steps."""

    def __init__(
        self,
        steps: Sequence[PipelineStep],
        runs: int = 5,
        seed: int = 0,
        threshold: float = 0.2,
        set_seeds: bool = True,
    ) -> None:
        if runs < 2:
            raise ValueError("PFD requires at least two runs to estimate variance.")
        self.steps = list(steps)
        self.runs = runs
        self.seed = seed
        self.threshold = threshold
        self.set_seeds = set_seeds

    def run(self, initial_input: Any = None) -> List[StepAnalysis]:
        """Execute the configured pipeline and return per-step analyses."""

        step_runs: Dict[str, List[StepRun]] = {step.name: [] for step in self.steps}
        for run_index in range(self.runs):
            if self.set_seeds:
                _seed_environment(self.seed, run_index)
            context = initial_input
            aborted = False
            for step in self.steps:
                if aborted:
                    step_runs[step.name].append(
                        StepRun(
                            step_name=step.name,
                            value_repr="<skipped>",
                            value_hash=_stable_hash("<skipped>"),
                            numeric_vector=None,
                            exception=None,
                            skipped=True,
                        )
                    )
                    continue
                try:
                    value = step.func(context)
                    value_repr = _stable_serialize(value)
                    numeric_vector = _extract_numeric_vector(value)
                    step_runs[step.name].append(
                        StepRun(
                            step_name=step.name,
                            value_repr=value_repr,
                            value_hash=_stable_hash(value_repr),
                            numeric_vector=numeric_vector,
                        )
                    )
                    context = value
                except Exception as exc:  # noqa: BLE001
                    exc_repr = f"{type(exc).__name__}: {exc}"
                    step_runs[step.name].append(
                        StepRun(
                            step_name=step.name,
                            value_repr=exc_repr,
                            value_hash=_stable_hash(exc_repr),
                            numeric_vector=None,
                            exception=exc_repr,
                        )
                    )
                    aborted = True
            time.sleep(0)  # Yield to ensure consistent scheduling in tests.
        return self._analyze_runs(step_runs)

    def _analyze_runs(self, step_runs: Mapping[str, List[StepRun]]) -> List[StepAnalysis]:
        analyses: List[StepAnalysis] = []
        for step in self.steps:
            runs = step_runs[step.name]
            value_counter: Counter[str] = Counter(run.value_hash for run in runs)
            most_common = value_counter.most_common(1)
            most_common_count = most_common[0][1] if most_common else 0
            difference_ratio = 1.0 - (most_common_count / max(1, len(runs)))
            failures = sum(1 for run in runs if run.exception is not None)
            failure_ratio = failures / len(runs)
            stats = _compute_statistics(run.numeric_vector for run in runs)
            normalized_variance = float(stats.get("normalized_variance", 0.0))
            exceptions = sorted({run.exception for run in runs if run.exception})
            unique_samples: List[Mapping[str, Any]] = []
            # Deterministic order: by descending count then lexicographic repr.
            for value_hash, count in sorted(
                value_counter.items(),
                key=lambda item: (-item[1], item[0]),
            ):
                # Retrieve representative repr deterministically.
                repr_candidates = [run.value_repr for run in runs if run.value_hash == value_hash]
                repr_candidates.sort()
                sample_repr = repr_candidates[0] if repr_candidates else ""
                unique_samples.append(
                    {
                        "count": count,
                        "fraction": count / len(runs),
                        "repr": sample_repr,
                    }
                )
            flakiness_score = difference_ratio + normalized_variance + failure_ratio
            flagged = flakiness_score >= self.threshold
            blame_file: Optional[str] = None
            blame_line: Optional[int] = None
            try:
                source_file = inspect.getsourcefile(step.func)
                if source_file:
                    blame_file = source_file
                    _, first_line = inspect.getsourcelines(step.func)
                    blame_line = first_line
            except (OSError, TypeError):  # pragma: no cover - introspection edge cases.
                pass
            analyses.append(
                StepAnalysis(
                    name=step.name,
                    flakiness_score=flakiness_score,
                    difference_ratio=difference_ratio,
                    failure_ratio=failure_ratio,
                    normalized_variance=normalized_variance,
                    mean=stats.get("mean"),
                    variance=stats.get("variance"),
                    num_runs=len(runs),
                    failures=failures,
                    unique_value_samples=unique_samples,
                    flagged=flagged,
                    blame_file=blame_file,
                    blame_line=blame_line,
                    exceptions=exceptions,
                )
            )
        return analyses


__all__ = [
    "PipelineFlakinessDetector",
    "PipelineStep",
    "StepAnalysis",
    "StepRun",
]
