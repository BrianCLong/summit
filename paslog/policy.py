"""Policy enforcement helpers."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Iterable, List, Mapping, Pattern

from .schema import LogSchema


class PolicyViolationError(RuntimeError):
    """Raised when generated data violates a configured policy."""


_DEFAULT_PII_PATTERNS = (
    re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    re.compile(r"\b(?:\d[ -]?){13,16}\b"),
)


@dataclass
class PolicyConstraints:
    """Policies applied during generation and validation."""

    disallowed_fields: Iterable[str] = ()
    pii_patterns: Iterable[Pattern[str]] = _DEFAULT_PII_PATTERNS
    allow_extra_fields: bool = False

    disallowed_field_set: set[str] = field(init=False, repr=False)
    pii_pattern_list: List[Pattern[str]] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.disallowed_field_set = {field.strip() for field in self.disallowed_fields if field.strip()}
        self.pii_pattern_list = list(self.pii_patterns)

    def validate_schema(self, schema: LogSchema) -> None:
        for field in schema:
            if field.name in self.disallowed_field_set:
                raise PolicyViolationError(
                    f"Field '{field.name}' is blocked by policy and cannot be generated"
                )

    def validate_record(self, record: Mapping[str, object]) -> None:
        for key, value in record.items():
            if key in self.disallowed_field_set:
                raise PolicyViolationError(f"Field '{key}' is not permitted by policy")
            if isinstance(value, str) and self._contains_pii(value):
                raise PolicyViolationError(
                    f"Field '{key}' produced a value that matches a PII pattern"
                )

    def _contains_pii(self, value: str) -> bool:
        return any(pattern.search(value) for pattern in self.pii_pattern_list)
