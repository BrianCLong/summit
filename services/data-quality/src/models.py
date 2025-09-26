"""Typed models shared by the data quality service."""

from __future__ import annotations

from datetime import datetime
from hashlib import sha256
from typing import Any

from pydantic import BaseModel, Field, validator


class Rule(BaseModel):
    """Declarative data quality rule."""

    id: str
    field: str
    type: str
    params: dict[str, Any] = Field(default_factory=dict)

    @validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        """Ensure the rule type is one of the supported options."""
        allowed = {"regex", "range", "required", "ref"}
        if v not in allowed:
            raise ValueError(f"type must be one of {allowed}")
        return v


class EvaluationRequest(BaseModel):
    """Request payload used when evaluating rules."""

    payload: dict[str, Any]
    rules: list[Rule]


class Finding(BaseModel):
    """Represents a single rule violation."""

    rule_id: str
    field: str
    message: str


class QuarantineItem(BaseModel):
    """Persisted metadata about quarantined payloads."""

    id: str
    payload: dict[str, Any]
    reason: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    previous_sha: str | None = None
    sha: str | None = None

    def seal(self, previous: QuarantineItem | None) -> None:
        """Link the item to the previous quarantine entry and compute its hash."""
        self.previous_sha = previous.sha if previous else None
        to_hash = (previous.sha if previous else "") + str(self.payload) + self.reason
        self.sha = sha256(to_hash.encode()).hexdigest()
