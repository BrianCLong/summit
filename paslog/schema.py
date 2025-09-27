"""Schema definitions for PASLOG."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Iterable, List, Optional, Sequence

from .distributions import DistributionSpec


class FieldType(str, Enum):
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    TIMESTAMP = "timestamp"


@dataclass(frozen=True)
class FieldSpec:
    """Definition of a schema field."""

    name: str
    field_type: FieldType
    distribution: DistributionSpec
    nullable: bool = False
    max_cardinality: Optional[int] = None

    def __post_init__(self) -> None:
        if not self.name:
            raise ValueError("Field name must not be empty")
        if self.max_cardinality is not None and self.max_cardinality <= 0:
            raise ValueError("max_cardinality must be positive when provided")


@dataclass(frozen=True)
class LogSchema:
    """Schema describing a synthetic log stream."""

    name: str
    fields: Sequence[FieldSpec]

    def __post_init__(self) -> None:
        if not self.name:
            raise ValueError("Schema must have a name")
        seen = set()
        for field in self.fields:
            if field.name in seen:
                raise ValueError(f"Duplicate field name detected: {field.name}")
            seen.add(field.name)
        if not self.fields:
            raise ValueError("Schema must contain at least one field")

    def field_map(self) -> Dict[str, FieldSpec]:
        return {field.name: field for field in self.fields}

    def field_names(self) -> List[str]:
        return [field.name for field in self.fields]

    def __iter__(self) -> Iterable[FieldSpec]:
        return iter(self.fields)
