"""Freshness scoring primitives."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Mapping, MutableMapping, Optional, Sequence

from pydantic import BaseModel, Field, field_validator

from .decay import DecayKernel, DecayFunction, get_decay_function


@dataclass(frozen=True)
class ContentRecord:
    """Metadata associated with a retrieved document."""

    source: str
    published_at: datetime
    last_verified_at: Optional[datetime] = None

    def most_recent_timestamp(self) -> datetime:
        """Return the freshest timestamp available for the record."""

        if self.last_verified_at and self.last_verified_at > self.published_at:
            return self.last_verified_at
        return self.published_at


@dataclass(frozen=True)
class ScoredCandidate:
    """A candidate answer scored for freshness-aware ranking."""

    candidate_id: str
    relevance: float
    freshness: float
    combined_score: float
    record: ContentRecord


class FreshnessConfig(BaseModel):
    """Configuration for :class:`FreshnessScorer`."""

    default_half_life_hours: float = Field(..., gt=0)
    source_half_lives: Mapping[str, float] = Field(default_factory=dict)
    kernel: DecayKernel = Field(default=DecayKernel.EXPONENTIAL)

    @field_validator("source_half_lives", mode="before")
    @classmethod
    def _normalize_half_lives(
        cls, value: Mapping[str, float]
    ) -> Mapping[str, float]:  # pragma: no cover - pydantic handles coverage
        return {k: float(v) for k, v in value.items()}

    def half_life_for(self, source: str) -> timedelta:
        hours = self.source_half_lives.get(source, self.default_half_life_hours)
        return timedelta(hours=hours)

    def decay_function(self) -> DecayFunction:
        return get_decay_function(self.kernel)


class FreshnessScorer:
    """Compute freshness scores and re-rank retrieval candidates."""

    def __init__(
        self,
        config: FreshnessConfig,
        now: Optional[datetime] = None,
    ) -> None:
        self.config = config
        self.now = now or datetime.now(timezone.utc)
        self._decay_fn = config.decay_function()

    def _age(self, record: ContentRecord) -> timedelta:
        reference = record.most_recent_timestamp()
        if reference.tzinfo is None:
            reference = reference.replace(tzinfo=timezone.utc)
        return self.now - reference

    def score(self, record: ContentRecord) -> float:
        age = self._age(record)
        half_life = self.config.half_life_for(record.source)
        return float(self._decay_fn(age, half_life))

    def rerank(
        self,
        candidates: Sequence[tuple[str, float, ContentRecord]],
        freshness_weight: float = 1.0,
    ) -> Sequence[ScoredCandidate]:
        scored: list[ScoredCandidate] = []
        for candidate_id, relevance, record in candidates:
            freshness = self.score(record)
            combined = relevance * ((1 - freshness_weight) + freshness_weight * freshness)
            scored.append(
                ScoredCandidate(
                    candidate_id=candidate_id,
                    relevance=relevance,
                    freshness=freshness,
                    combined_score=combined,
                    record=record,
                )
            )
        scored.sort(key=lambda item: item.combined_score, reverse=True)
        return scored

    @classmethod
    def from_metadata(
        cls,
        metadata: Mapping[str, MutableMapping[str, object]],
        relevance_key: str = "relevance",
        record_key: str = "record",
        config: Optional[FreshnessConfig] = None,
        now: Optional[datetime] = None,
        freshness_weight: float = 1.0,
    ) -> Sequence[ScoredCandidate]:
        """Build candidates from metadata and re-rank them."""

        if config is None:
            config = FreshnessConfig(
                default_half_life_hours=72,
                source_half_lives={},
            )
        scorer = cls(config=config, now=now)
        structured: list[tuple[str, float, ContentRecord]] = []
        for candidate_id, payload in metadata.items():
            raw_record = payload.get(record_key)
            if not isinstance(raw_record, dict):
                raise ValueError(f"Candidate {candidate_id} is missing record metadata")
            record = ContentRecord(
                source=str(raw_record["source"]),
                published_at=_coerce_datetime(raw_record["published_at"]),
                last_verified_at=(
                    _coerce_datetime(raw_record["last_verified_at"])
                    if raw_record.get("last_verified_at")
                    else None
                ),
            )
            relevance_value = payload.get(relevance_key)
            if relevance_value is None:
                raise ValueError(f"Candidate {candidate_id} missing relevance score")
            structured.append((candidate_id, float(relevance_value), record))
        return scorer.rerank(structured, freshness_weight=freshness_weight)


def _coerce_datetime(value: object) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    raise TypeError(f"Unsupported datetime value: {value!r}")
