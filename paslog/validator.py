"""Validation helpers for PASLOG outputs."""

from __future__ import annotations

import datetime as _dt
from dataclasses import dataclass, field
from typing import List, Mapping, Sequence

from .policy import PolicyConstraints, PolicyViolationError
from .schema import FieldSpec, FieldType, LogSchema


@dataclass
class ValidationResult:
    valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class LogValidator:
    schema: LogSchema
    policy: PolicyConstraints = field(default_factory=PolicyConstraints)

    def __post_init__(self) -> None:
        self.policy.validate_schema(self.schema)

    def validate(self, records: Sequence[Mapping[str, object]]) -> ValidationResult:
        errors: List[str] = []
        warnings: List[str] = []
        field_map = self.schema.field_map()
        cardinalities = {field.name: set() for field in self.schema}

        for index, record in enumerate(records):
            self._validate_record_structure(index, record, field_map, errors)
            try:
                self.policy.validate_record(record)
            except PolicyViolationError as exc:
                errors.append(f"record {index}: {exc}")

            for field_name, spec in field_map.items():
                value = record.get(field_name)
                self._validate_field_value(index, spec, value, errors)
                if spec.max_cardinality is not None and value is not None:
                    cardinalities[field_name].add(value)

            if not self.policy.allow_extra_fields:
                extras = set(record.keys()) - set(field_map.keys())
                if extras:
                    warnings.append(
                        f"record {index}: contains extra fields not in schema: {sorted(extras)}"
                    )

        for field in self.schema:
            if field.max_cardinality is not None:
                observed = len(cardinalities[field.name])
                if observed > field.max_cardinality:
                    errors.append(
                        f"field '{field.name}' exceeded cardinality: {observed} > {field.max_cardinality}"
                    )

        return ValidationResult(valid=not errors, errors=errors, warnings=warnings)

    def _validate_record_structure(
        self,
        index: int,
        record: Mapping[str, object],
        field_map: Mapping[str, FieldSpec],
        errors: List[str],
    ) -> None:
        for field_name in field_map:
            if field_name not in record:
                errors.append(f"record {index}: missing field '{field_name}'")

    def _validate_field_value(
        self,
        index: int,
        spec: FieldSpec,
        value: object,
        errors: List[str],
    ) -> None:
        if value is None:
            if not spec.nullable:
                errors.append(f"record {index}: field '{spec.name}' is null but not nullable")
            return

        if spec.field_type == FieldType.STRING:
            if not isinstance(value, str):
                errors.append(self._type_error(index, spec, value, "string"))
        elif spec.field_type == FieldType.INTEGER:
            if not isinstance(value, int) or isinstance(value, bool):
                errors.append(self._type_error(index, spec, value, "integer"))
        elif spec.field_type == FieldType.FLOAT:
            if not isinstance(value, (int, float)) or isinstance(value, bool):
                errors.append(self._type_error(index, spec, value, "float"))
        elif spec.field_type == FieldType.BOOLEAN:
            if not isinstance(value, bool):
                errors.append(self._type_error(index, spec, value, "boolean"))
        elif spec.field_type == FieldType.TIMESTAMP:
            if not isinstance(value, str):
                errors.append(self._type_error(index, spec, value, "timestamp string"))
            else:
                self._validate_timestamp(index, spec, value, errors)

    def _validate_timestamp(
        self, index: int, spec: FieldSpec, value: str, errors: List[str]
    ) -> None:
        try:
            # Support both ISO8601 with Z and without.
            if value.endswith("Z"):
                _dt.datetime.fromisoformat(value[:-1])
            else:
                _dt.datetime.fromisoformat(value)
        except ValueError:
            errors.append(
                f"record {index}: field '{spec.name}' timestamp '{value}' is not ISO8601 compatible"
            )

    def _type_error(self, index: int, spec: FieldSpec, value: object, expected: str) -> str:
        return (
            f"record {index}: field '{spec.name}' expected {expected} but received "
            f"{type(value).__name__}: {value!r}"
        )
