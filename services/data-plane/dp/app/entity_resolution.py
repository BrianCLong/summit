"""
Identity stitching / entity resolution for the Summit data plane.

Goals:
  - Extract canonical entities (people, repos, orgs) from CanonicalEvents
  - Deduplicate: same GitHub user appearing under multiple events → one entity
  - Stitch: track which source events contributed to each entity

This is a deterministic, in-process implementation backed by an in-memory store.
For production, swap the EntityStore with Neo4j/Postgres-backed repositories.
"""
from __future__ import annotations

import logging
from typing import Any

from .models import CanonicalEntity, CanonicalEvent, EntityType

logger = logging.getLogger(__name__)


class EntityStore:
    """
    Minimal in-memory store for resolved entities.

    Key: (entity_type, canonical_key) where canonical_key is the
    normalized form used for deduplication (e.g. lowercased login).
    """

    def __init__(self) -> None:
        # (entity_type, canonical_key) → CanonicalEntity
        self._index: dict[tuple[str, str], CanonicalEntity] = {}

    def upsert(
        self,
        entity_type: EntityType,
        canonical_key: str,
        name: str,
        attributes: dict[str, Any],
        source_event_id: str,
        evidence_id: str | None = None,
        confidence: float = 1.0,
    ) -> CanonicalEntity:
        """
        Return the existing entity for (type, key) if present, updating it with
        new attributes and source event.  Create a new entity otherwise.
        """
        index_key = (entity_type.value, canonical_key.lower())
        entity = self._index.get(index_key)

        if entity is None:
            entity = CanonicalEntity(
                entity_type=entity_type,
                canonical_name=name,
                confidence=confidence,
                source_ids=[source_event_id],
                attributes=attributes,
                evidence_ids=[evidence_id] if evidence_id else [],
            )
            self._index[index_key] = entity
        else:
            # Merge: keep existing, add new source
            if source_event_id not in entity.source_ids:
                entity.source_ids.append(source_event_id)
            if evidence_id and evidence_id not in entity.evidence_ids:
                entity.evidence_ids.append(evidence_id)
            # Overlay new attributes without overwriting existing non-null values
            for k, v in attributes.items():
                if v is not None and entity.attributes.get(k) is None:
                    entity.attributes[k] = v

        return entity

    def get_all(self) -> list[CanonicalEntity]:
        return list(self._index.values())

    def find(
        self,
        entity_type: EntityType | None = None,
        name_contains: str | None = None,
        limit: int = 20,
    ) -> list[CanonicalEntity]:
        results = list(self._index.values())
        if entity_type:
            results = [e for e in results if e.entity_type == entity_type]
        if name_contains:
            lc = name_contains.lower()
            results = [e for e in results if lc in e.canonical_name.lower()]
        return results[:limit]

    def count(self) -> int:
        return len(self._index)


class EntityResolver:
    """
    Extracts and stitches entities from CanonicalEvents.

    Extraction rules (per event_type prefix):
        pr.*         → PERSON (author), REPOSITORY
        issue.*      → PERSON (author), REPOSITORY
        ci.*         → PERSON (actor), REPOSITORY, CI_RUN
        repo.*       → REPOSITORY
        generic.*    → best-effort
    """

    def __init__(self, store: EntityStore | None = None) -> None:
        self._store = store or EntityStore()

    @property
    def store(self) -> EntityStore:
        return self._store

    def process(self, event: CanonicalEvent, evidence_id: str | None = None) -> list[CanonicalEntity]:
        """Extract entities from a single CanonicalEvent and upsert into the store."""
        resolved: list[CanonicalEntity] = []
        d = event.data
        prefix = event.event_type.split(".")[0]  # "pr", "issue", "ci", "repo", …

        # --- Repository entity ---
        repo_name = d.get("repo")
        if repo_name:
            ent = self._store.upsert(
                entity_type=EntityType.REPOSITORY,
                canonical_key=repo_name,
                name=repo_name,
                attributes={"full_name": repo_name, "source": event.source_service},
                source_event_id=event.event_id,
                evidence_id=evidence_id,
            )
            resolved.append(ent)

        # --- Person entity (author / actor) ---
        actor_login = d.get("author_login") or d.get("triggering_actor_login")
        actor_id = d.get("author_id") or d.get("triggering_actor_id")
        if actor_login:
            attrs: dict[str, Any] = {"login": actor_login}
            if actor_id:
                attrs["github_id"] = actor_id
            ent = self._store.upsert(
                entity_type=EntityType.PERSON,
                canonical_key=actor_login,
                name=actor_login,
                attributes=attrs,
                source_event_id=event.event_id,
                evidence_id=evidence_id,
            )
            resolved.append(ent)

        # --- Domain-specific entities ---
        if prefix == "pr":
            pr_key = f"{repo_name}#pr{d.get('number', '')}"
            ent = self._store.upsert(
                entity_type=EntityType.PULL_REQUEST,
                canonical_key=pr_key,
                name=d.get("title", pr_key),
                attributes={
                    "number": d.get("number"),
                    "state": d.get("state"),
                    "head_sha": d.get("head_sha"),
                    "repo": repo_name,
                },
                source_event_id=event.event_id,
                evidence_id=evidence_id,
            )
            resolved.append(ent)

        elif prefix == "issue":
            issue_key = f"{repo_name}#issue{d.get('number', '')}"
            ent = self._store.upsert(
                entity_type=EntityType.ISSUE,
                canonical_key=issue_key,
                name=d.get("title", issue_key),
                attributes={
                    "number": d.get("number"),
                    "state": d.get("state"),
                    "repo": repo_name,
                },
                source_event_id=event.event_id,
                evidence_id=evidence_id,
            )
            resolved.append(ent)

        elif prefix == "ci":
            run_key = f"{repo_name}#run{d.get('run_id', '')}"
            ent = self._store.upsert(
                entity_type=EntityType.CI_RUN,
                canonical_key=run_key,
                name=d.get("name", run_key),
                attributes={
                    "run_id": d.get("run_id"),
                    "conclusion": d.get("conclusion"),
                    "status": d.get("status"),
                    "head_sha": d.get("head_sha"),
                    "repo": repo_name,
                },
                source_event_id=event.event_id,
                evidence_id=evidence_id,
            )
            resolved.append(ent)

        logger.debug(
            "entity_resolver.process event_id=%s entities_resolved=%d",
            event.event_id,
            len(resolved),
        )
        return resolved
