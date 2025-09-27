"""Synthetic log generator entrypoints."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Dict, Iterator, List, Optional

from .policy import PolicyConstraints, PolicyViolationError
from .schema import FieldSpec, LogSchema


@dataclass
class LogGenerator:
    """Generate synthetic logs honoring schema and policy constraints."""

    schema: LogSchema
    policy: PolicyConstraints = field(default_factory=PolicyConstraints)
    seed: Optional[int] = None

    def __post_init__(self) -> None:
        self._rng = random.Random(self.seed)
        self.policy.validate_schema(self.schema)
        self._cardinality_cache: Dict[str, Dict[str, object]] = {}
        for field in self.schema:
            self._cardinality_cache[field.name] = {"values": [], "set": set()}

    def generate(self, count: int) -> List[Dict[str, object]]:
        if count < 0:
            raise ValueError("count must be non-negative")
        return [self._generate_record() for _ in range(count)]

    def stream(self, count: int) -> Iterator[Dict[str, object]]:
        if count < 0:
            raise ValueError("count must be non-negative")
        for _ in range(count):
            yield self._generate_record()

    def _generate_record(self) -> Dict[str, object]:
        record: Dict[str, object] = {}
        for field in self.schema:
            record[field.name] = self._sample_field(field)
        self.policy.validate_record(record)
        return record

    def _sample_field(self, field: FieldSpec) -> object:
        cache = self._cardinality_cache[field.name]
        values: List[object] = cache["values"]  # type: ignore[assignment]
        value_set = cache["set"]  # type: ignore[assignment]

        if field.max_cardinality:
            if len(values) < field.max_cardinality:
                value = self._sample_unique(field, values, value_set)
            else:
                value = self._rng.choice(values)
        else:
            value = field.distribution.sample(self._rng)

        if value is None and not field.nullable:
            raise PolicyViolationError(
                f"Field '{field.name}' distribution returned None but field is not nullable"
            )
        return value

    def _sample_unique(self, field: FieldSpec, values: List[object], value_set: set) -> object:
        attempts = field.max_cardinality * 2 if field.max_cardinality else 5
        candidate: object | None = None
        for _ in range(max(attempts, 5)):
            candidate = field.distribution.sample(self._rng)
            if candidate is None and not field.nullable:
                raise PolicyViolationError(
                    f"Field '{field.name}' distribution returned None but field is not nullable"
                )
            if candidate not in value_set:
                values.append(candidate)
                value_set.add(candidate)
                return candidate
        if values:
            return self._rng.choice(values)
        # fallback: accept the latest candidate even if duplicate to avoid returning None
        if candidate is None and not field.nullable:
            raise PolicyViolationError(
                f"Field '{field.name}' distribution returned None but field is not nullable"
            )
        values.append(candidate)
        value_set.add(candidate)
        return candidate
