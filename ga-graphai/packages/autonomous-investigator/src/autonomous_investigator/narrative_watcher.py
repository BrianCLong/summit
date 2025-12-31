from __future__ import annotations

import json
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class MemoryEntry:
    """Immutable record of a narrative observation and the agent's response."""

    timestamp: datetime
    case_id: str
    topic: str
    entities: list[str]
    narratives: list[str]
    sources: list[str]
    actions: list[str]
    outcome: str
    signal_score: float
    prompt_version: str
    source_priorities: dict[str, float] = field(default_factory=dict)
    graph_queries: list[str] = field(default_factory=list)
    redundant_fetches: int = 0

    def to_dict(self) -> dict[str, object]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "case_id": self.case_id,
            "topic": self.topic,
            "entities": self.entities,
            "narratives": self.narratives,
            "sources": self.sources,
            "actions": self.actions,
            "outcome": self.outcome,
            "signal_score": self.signal_score,
            "prompt_version": self.prompt_version,
            "source_priorities": self.source_priorities,
            "graph_queries": self.graph_queries,
            "redundant_fetches": self.redundant_fetches,
        }

    @staticmethod
    def from_dict(data: dict[str, object]) -> "MemoryEntry":
        return MemoryEntry(
            timestamp=_parse_timestamp(data.get("timestamp")),
            case_id=str(data.get("case_id", "")),
            topic=str(data.get("topic", "")),
            entities=list(data.get("entities", [])),
            narratives=list(data.get("narratives", [])),
            sources=list(data.get("sources", [])),
            actions=list(data.get("actions", [])),
            outcome=str(data.get("outcome", "")),
            signal_score=float(data.get("signal_score", 0.0)),
            prompt_version=str(data.get("prompt_version", "")),
            source_priorities=dict(data.get("source_priorities", {})),
            graph_queries=list(data.get("graph_queries", [])),
            redundant_fetches=int(data.get("redundant_fetches", 0)),
        )


@dataclass(frozen=True)
class PerformanceSnapshot:
    """Rolling performance metrics for reflection loops."""

    signal_to_noise: float
    redundant_fetch_rate: float
    mean_signal_score: float
    sample_size: int


@dataclass(frozen=True)
class ReflectionReport:
    """Outcome of a reflective tuning loop."""

    prompt: str
    source_priorities: dict[str, float]
    graph_queries: list[str]
    performance: PerformanceSnapshot
    notes: list[str]


class MemoryStore:
    """Durable store for narrative watcher actions and outcomes."""

    def __init__(self, path: Path, retention_days: int = 45, max_entries: int = 500) -> None:
        self.path = path
        self.retention = timedelta(days=retention_days)
        self.max_entries = max_entries
        self._entries: list[MemoryEntry] = []
        self._load()

    @property
    def entries(self) -> list[MemoryEntry]:
        return list(self._entries)

    def append(self, entry: MemoryEntry) -> None:
        self._entries.append(entry)
        self._prune()
        self._persist()

    def _persist(self) -> None:
        payload = [entry.to_dict() for entry in self._entries]
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(payload, indent=2))

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            raw_data = json.loads(self.path.read_text())
        except json.JSONDecodeError:
            return
        if not isinstance(raw_data, list):
            return
        entries = []
        for item in raw_data:
            if isinstance(item, dict):
                entries.append(MemoryEntry.from_dict(item))
        self._entries = entries
        self._prune()

    def _prune(self) -> None:
        now = datetime.now(timezone.utc)
        cutoff = now - self.retention
        filtered = [entry for entry in self._entries if entry.timestamp >= cutoff]
        filtered.sort(key=lambda entry: entry.timestamp, reverse=True)
        if len(filtered) > self.max_entries:
            filtered = filtered[: self.max_entries]
        self._entries = list(reversed(filtered))


class NarrativeWatcher:
    """Persistent, self-tuning watcher for bounded narratives."""

    def __init__(self, memory_store: MemoryStore, base_prompt: str | None = None) -> None:
        self.memory_store = memory_store
        self.current_prompt = base_prompt or (
            "You are the Summit narrative watcher. Track disinformation and sector risks, "
            "keeping IntelGraph updated with entities, narratives, and sources."
        )
        self.graph_query_templates: list[str] = [
            "MATCH (n:Narrative)-[r:MENTIONS]->(e:Entity) RETURN n.id, collect(distinct e.name) LIMIT 25",
            "MATCH (s:Source)-[:PUBLISHES]->(n:Narrative) RETURN s.name, count(*) AS articles ORDER BY articles DESC LIMIT 15",
        ]
        self.source_priorities: dict[str, float] = {}

    def record_observation(
        self,
        case_id: str,
        topic: str,
        entities: Iterable[str],
        narratives: Iterable[str],
        sources: Iterable[str],
        actions: Iterable[str],
        outcome: str,
        signal_score: float,
        prompt_version: str,
        graph_queries: Iterable[str],
        redundant_fetches: int = 0,
    ) -> MemoryEntry:
        entry = MemoryEntry(
            timestamp=datetime.now(timezone.utc),
            case_id=case_id,
            topic=topic,
            entities=sorted(set(entities)),
            narratives=sorted(set(narratives)),
            sources=sorted(set(sources)),
            actions=list(actions),
            outcome=outcome,
            signal_score=signal_score,
            prompt_version=prompt_version,
            source_priorities=self.source_priorities,
            graph_queries=list(graph_queries),
            redundant_fetches=redundant_fetches,
        )
        self.memory_store.append(entry)
        return entry

    def reflect(self, window: int = 12) -> ReflectionReport:
        entries = self.memory_store.entries[-window:]
        snapshot = self._compute_performance(entries)
        tuned_priorities = self._tune_sources(entries)
        tuned_queries = self._tune_queries(entries)
        prompt = self._compose_prompt(snapshot, tuned_priorities, tuned_queries)
        self.current_prompt = prompt
        self.source_priorities = tuned_priorities
        self.graph_query_templates = tuned_queries
        notes = self._build_notes(snapshot, tuned_priorities, tuned_queries)
        return ReflectionReport(
            prompt=prompt,
            source_priorities=tuned_priorities,
            graph_queries=tuned_queries,
            performance=snapshot,
            notes=notes,
        )

    def _compute_performance(self, entries: list[MemoryEntry]) -> PerformanceSnapshot:
        if not entries:
            return PerformanceSnapshot(0.0, 0.0, 0.0, 0)
        signal_scores = [entry.signal_score for entry in entries]
        positive = [score for score in signal_scores if score >= 0.6]
        redundant_total = sum(entry.redundant_fetches for entry in entries)
        fetch_total = sum(len(entry.sources) + entry.redundant_fetches for entry in entries)
        redundant_rate = redundant_total / fetch_total if fetch_total else 0.0
        signal_to_noise = len(positive) / len(entries)
        mean_signal = sum(signal_scores) / len(signal_scores)
        return PerformanceSnapshot(
            signal_to_noise=round(signal_to_noise, 3),
            redundant_fetch_rate=round(redundant_rate, 3),
            mean_signal_score=round(mean_signal, 3),
            sample_size=len(entries),
        )

    def _tune_sources(self, entries: list[MemoryEntry]) -> dict[str, float]:
        if not entries:
            return self.source_priorities or {}
        source_success = defaultdict(list)
        for entry in entries:
            for source in entry.sources:
                source_success[source].append(entry.signal_score - 0.3 * entry.redundant_fetches)
        priorities: dict[str, float] = {}
        for source, values in source_success.items():
            score = max(0.05, sum(values) / len(values))
            priorities[source] = round(score, 3)
        normalized = _normalize(priorities)
        return normalized

    def _tune_queries(self, entries: list[MemoryEntry]) -> list[str]:
        if not entries:
            return self.graph_query_templates
        narrative_counter: Counter[str] = Counter()
        entity_counter: Counter[str] = Counter()
        for entry in entries:
            narrative_counter.update(entry.narratives)
            entity_counter.update(entry.entities)
        top_narratives = ", ".join([item for item, _ in narrative_counter.most_common(3)])
        top_entities = [item for item, _ in entity_counter.most_common(4)]
        tuned_queries = [
            (
                "MATCH (n:Narrative)-[:MENTIONS]->(e:Entity) WHERE n.label IN $narratives "
                "RETURN n.label, collect(distinct e.name) AS entities ORDER BY size(entities) DESC LIMIT 15"
            ),
            (
                "MATCH (s:Source)-[:PUBLISHES]->(n:Narrative)-[:MENTIONS]->(e:Entity) "
                "WHERE e.name IN $focusEntities RETURN s.name, count(*) AS hits ORDER BY hits DESC LIMIT 20"
            ),
        ]
        if top_entities:
            tuned_queries.append(
                "MATCH (e:Entity {name: $entity})-[:CO_OCCURS_WITH]->(other:Entity) "
                "RETURN other.name, other.weight ORDER BY other.weight DESC LIMIT 10"
            )
        if top_narratives:
            tuned_queries.append(
                "MATCH (n:Narrative {label: $narrative})-[:SUPPORTED_BY]->(s:Source) "
                "RETURN s.name, s.trust_score ORDER BY s.trust_score DESC LIMIT 10"
            )
        return tuned_queries

    def _compose_prompt(
        self,
        snapshot: PerformanceSnapshot,
        source_priorities: dict[str, float],
        graph_queries: list[str],
    ) -> str:
        prioritized_sources = ", ".join(
            f"{source}:{weight:.2f}" for source, weight in source_priorities.items()
        ) or "none"
        query_hint = graph_queries[0] if graph_queries else "MATCH (n) RETURN n LIMIT 5"
        return (
            "You are the Summit self-tuning narrative watcher. Monitor the bounded topic, reduce "
            "redundant fetches, and log entities/narratives/sources into IntelGraph. "
            f"Recent signal-to-noise: {snapshot.signal_to_noise:.2f}; redundant fetch rate: {snapshot.redundant_fetch_rate:.2f}. "
            f"Prioritize sources ({prioritized_sources}) and start with query template: {query_hint}. "
            "Revise prompts and source weighting if signal drops or redundancy rises."
        )

    def _build_notes(
        self,
        snapshot: PerformanceSnapshot,
        source_priorities: dict[str, float],
        graph_queries: list[str],
    ) -> list[str]:
        notes = [
            f"Sample size: {snapshot.sample_size}",
            f"Mean signal score: {snapshot.mean_signal_score:.2f}",
            f"Sources considered: {len(source_priorities)}",
            f"Graph query set size: {len(graph_queries)}",
        ]
        if snapshot.redundant_fetch_rate > 0.2:
            notes.append("Reduce fetch cadence for low-utility sources.")
        if snapshot.signal_to_noise < 0.5:
            notes.append("Increase counter-disinformation prompts and tighten acceptance criteria.")
        return notes


def _parse_timestamp(value: object) -> datetime:
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def _normalize(values: dict[str, float]) -> dict[str, float]:
    if not values:
        return {}
    total = sum(val for val in values.values() if val > 0)
    if total <= 0:
        return {key: 0.0 for key in values}
    return {key: round(val / total, 3) for key, val in values.items()}
