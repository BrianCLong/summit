from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

from autonomous_investigator.narrative_watcher import (
    MemoryEntry,
    MemoryStore,
    NarrativeWatcher,
)


def test_memory_store_prunes_old_entries(tmp_path: Path) -> None:
    store_path = tmp_path / "memory.json"
    store = MemoryStore(store_path, retention_days=1, max_entries=2)
    old_entry = MemoryEntry(
        timestamp=datetime.now(timezone.utc) - timedelta(days=3),
        case_id="case-1",
        topic="disinfo",
        entities=["entity-a"],
        narratives=["narrative-a"],
        sources=["source-a"],
        actions=["scan"],
        outcome="noisy",
        signal_score=0.3,
        prompt_version="v1",
        graph_queries=["MATCH (n) RETURN n"],
        redundant_fetches=2,
    )
    new_entry = MemoryEntry(
        timestamp=datetime.now(timezone.utc),
        case_id="case-2",
        topic="disinfo",
        entities=["entity-b"],
        narratives=["narrative-b"],
        sources=["source-b"],
        actions=["triage"],
        outcome="high-signal",
        signal_score=0.9,
        prompt_version="v1",
        graph_queries=["MATCH (n) RETURN n"],
    )
    store.append(old_entry)
    store.append(new_entry)

    persisted = store.entries
    assert len(persisted) == 1
    assert persisted[0].case_id == "case-2"

    # Ensure max_entries is respected
    another_entry = MemoryEntry(
        timestamp=datetime.now(timezone.utc),
        case_id="case-3",
        topic="sector-risk",
        entities=["entity-c"],
        narratives=["narrative-c"],
        sources=["source-c"],
        actions=["follow-up"],
        outcome="medium",
        signal_score=0.5,
        prompt_version="v2",
        graph_queries=["MATCH (n) RETURN n"],
    )
    store.append(another_entry)
    assert len(store.entries) == 2
    assert store.entries[0].case_id == "case-2"
    assert store.entries[1].case_id == "case-3"


def test_reflection_tunes_sources_and_queries(tmp_path: Path) -> None:
    store = MemoryStore(tmp_path / "memory.json", retention_days=10, max_entries=10)
    watcher = NarrativeWatcher(store)

    watcher.record_observation(
        case_id="case-1",
        topic="election",
        entities=["candidate-a", "candidate-b"],
        narratives=["fraud-claim"],
        sources=["trusted", "redundant"],
        actions=["ingest", "score"],
        outcome="signal-rich",
        signal_score=0.8,
        prompt_version="v1",
        graph_queries=["MATCH (n) RETURN n"],
        redundant_fetches=3,
    )
    watcher.record_observation(
        case_id="case-2",
        topic="election",
        entities=["candidate-a", "observer"],
        narratives=["fraud-claim", "turnout-surprise"],
        sources=["trusted", "field-reports"],
        actions=["triage", "publish"],
        outcome="high-confidence",
        signal_score=0.9,
        prompt_version="v1",
        graph_queries=["MATCH (n) RETURN n"],
        redundant_fetches=0,
    )

    reflection = watcher.reflect()

    assert "signal-to-noise" in reflection.prompt
    assert reflection.performance.signal_to_noise > 0
    assert reflection.source_priorities.get("trusted", 0) > reflection.source_priorities.get("redundant", 0)
    assert any("Narrative" in query or "MATCH" in query for query in reflection.graph_queries)


def test_record_observation_preserves_prompts_and_outcomes(tmp_path: Path) -> None:
    store = MemoryStore(tmp_path / "memory.json")
    watcher = NarrativeWatcher(store, base_prompt="baseline")

    entry = watcher.record_observation(
        case_id="case-3",
        topic="supply-chain",
        entities=["port", "carrier"],
        narratives=["delay"],
        sources=["manifest", "sensor"],
        actions=["fetch"],
        outcome="resolved",
        signal_score=0.7,
        prompt_version="v3",
        graph_queries=["MATCH (n) RETURN n"],
        redundant_fetches=1,
    )

    assert entry.prompt_version == "v3"
    assert entry.outcome == "resolved"
    assert watcher.current_prompt == "baseline"
