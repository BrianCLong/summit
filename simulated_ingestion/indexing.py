"""Utilities for indexing graph metadata into Elasticsearch."""

from __future__ import annotations

import hashlib
import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Tuple

from elasticsearch import Elasticsearch
from elasticsearch import exceptions as es_exceptions


LOGGER = logging.getLogger("graph_metadata_indexer")
if not LOGGER.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s"),
    )
    LOGGER.addHandler(handler)
LOGGER.setLevel(logging.INFO)


@dataclass
class IndexDefinition:
    """Container for Elasticsearch index settings."""

    name: str
    aliases: List[str]
    settings: Mapping[str, Any]
    mappings: Mapping[str, Any]


class GraphMetadataIndexer:
    """Incrementally index graph metadata documents in Elasticsearch."""

    def __init__(
        self,
        *,
        batch_size: int = 500,
        refresh: str = "wait_for",
        state_path: Optional[Path] = None,
        request_timeout: int = 30,
        max_retries: int = 3,
    ) -> None:
        self.logger = LOGGER
        self.batch_size = max(batch_size, 1)
        self.refresh = refresh
        self.state_path = state_path or Path(__file__).resolve().parents[1] / "search" / "index" / "graph_metadata_index_state.json"
        self.state: Dict[str, Dict[str, str]] = {"entities": {}, "relationships": {}}
        self.pending_state_updates: Dict[str, Dict[str, str]] = {"entities": {}, "relationships": {}}
        self.operations: List[Dict[str, Any]] = []
        self.enabled = True

        self.index_definitions = self._load_index_definitions()

        es_url = os.environ.get("ELASTICSEARCH_URL", "http://localhost:9200")
        auth_enabled = os.environ.get("ELASTICSEARCH_AUTH")
        username = os.environ.get("ELASTICSEARCH_USERNAME", "elastic") if auth_enabled else None
        password = os.environ.get("ELASTICSEARCH_PASSWORD", "changeme") if auth_enabled else None

        self.logger.debug(
            "Initializing Elasticsearch client",
            extra={"url": es_url, "auth": bool(auth_enabled)},
        )

        try:
            self.client = Elasticsearch(
                hosts=[es_url],
                basic_auth=(username, password) if username and password else None,
                request_timeout=request_timeout,
                max_retries=max_retries,
            )
            if not self.client.ping():
                self.logger.warning(
                    "Elasticsearch cluster is unreachable; disabling incremental indexing",
                )
                self.enabled = False
        except Exception:
            self.logger.exception("Failed to initialize Elasticsearch client; disabling incremental indexing")
            self.enabled = False

        self._load_state()

        if self.enabled:
            self.ensure_indices()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def ensure_indices(self) -> None:
        """Create indices if they do not already exist."""

        if not self.enabled:
            return

        for key, definition in self.index_definitions.items():
            try:
                if self.client.indices.exists(index=definition.name):
                    continue

                self.logger.info("Creating Elasticsearch index", extra={"index": definition.name})
                self.client.indices.create(
                    index=definition.name,
                    settings=definition.settings,
                    mappings=definition.mappings,
                )

                if definition.aliases:
                    actions = [
                        {"add": {"index": definition.name, "alias": alias}}
                        for alias in definition.aliases
                    ]
                    self.client.indices.update_aliases(actions=actions)
            except Exception:
                self.logger.exception("Failed to ensure index", extra={"index": definition.name, "key": key})
                self.enabled = False
                break

    def reset_indices(self) -> None:
        """Drop indices and clear local state before a full reindex."""

        if not self.enabled:
            return

        for definition in self.index_definitions.values():
            try:
                if self.client.indices.exists(index=definition.name):
                    self.logger.info("Deleting Elasticsearch index", extra={"index": definition.name})
                    self.client.indices.delete(index=definition.name)
            except es_exceptions.NotFoundError:
                continue
            except Exception:
                self.logger.exception("Failed to delete index", extra={"index": definition.name})
                raise

        self._clear_state()
        self.ensure_indices()

    def index_entities(self, entities: Iterable[Mapping[str, Any]]) -> None:
        """Queue entity documents for incremental indexing."""

        if not self.enabled:
            return

        for entity in entities:
            self.index_entity(entity)

    def index_relationships(self, relationships: Iterable[Mapping[str, Any]]) -> None:
        """Queue relationship documents for incremental indexing."""

        if not self.enabled:
            return

        for relationship in relationships:
            self.index_relationship(relationship)

    def index_entity(self, entity: Mapping[str, Any]) -> None:
        if not self.enabled:
            return

        entity_id = self._extract_entity_id(entity)
        if not entity_id:
            self.logger.warning("Skipping entity without identifier", extra={"entity": entity})
            return

        index_name = self.index_definitions["entities"].name
        document = self._build_entity_document(entity, entity_id)
        metadata_hash = self._hash_document(document)
        document["metadata_hash"] = metadata_hash

        if self._is_duplicate("entities", entity_id, metadata_hash):
            return

        self._queue_update(index_name, entity_id, document, "entities", metadata_hash)

    def index_relationship(self, relationship: Mapping[str, Any]) -> None:
        if not self.enabled:
            return

        relationship_id = self._extract_relationship_id(relationship)
        if not relationship_id:
            self.logger.warning(
                "Skipping relationship without identifier",
                extra={"relationship": relationship},
            )
            return

        index_name = self.index_definitions["relationships"].name
        document = self._build_relationship_document(relationship, relationship_id)
        metadata_hash = self._hash_document(document)
        document["metadata_hash"] = metadata_hash

        if self._is_duplicate("relationships", relationship_id, metadata_hash):
            return

        self._queue_update(index_name, relationship_id, document, "relationships", metadata_hash)

    def flush(self) -> None:
        """Send queued operations to Elasticsearch."""

        if not self.enabled:
            return

        if not self.operations:
            if any(self.pending_state_updates.values()):
                self._commit_state_updates()
            return

        try:
            self.logger.info(
                "Flushing bulk operations",
                extra={"operation_count": len(self.operations) // 2},
            )
            response = self.client.bulk(operations=self.operations, refresh=self.refresh)

            if response.get("errors"):
                failures = [item for item in response.get("items", []) if any(v.get("error") for v in item.values())]
                self.logger.error(
                    "Bulk indexing completed with errors",
                    extra={"failure_count": len(failures), "failures": failures[:5]},
                )
            else:
                self.logger.info(
                    "Bulk indexing succeeded",
                    extra={"took_ms": response.get("took"), "items": len(response.get("items", []))},
                )
                self._commit_state_updates()
        finally:
            self.operations = []
            self.pending_state_updates = {"entities": {}, "relationships": {}}

    # ------------------------------------------------------------------
    # Snapshot helpers
    # ------------------------------------------------------------------
    def snapshot_state(self) -> Dict[str, Dict[str, str]]:
        """Return the cached metadata hashes for debugging."""

        return {
            "entities": dict(self.state["entities"]),
            "relationships": dict(self.state["relationships"]),
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _queue_update(
        self,
        index_name: str,
        doc_id: str,
        document: Mapping[str, Any],
        bucket: str,
        metadata_hash: str,
    ) -> None:
        self.operations.append({"update": {"_index": index_name, "_id": doc_id}})
        self.operations.append({"doc": document, "doc_as_upsert": True})
        self.pending_state_updates[bucket][doc_id] = metadata_hash

        if len(self.operations) // 2 >= self.batch_size:
            self.flush()

    def _extract_entity_id(self, entity: Mapping[str, Any]) -> Optional[str]:
        if "id" in entity:
            return str(entity["id"])

        properties = entity.get("properties") if isinstance(entity, Mapping) else None
        if isinstance(properties, Mapping) and "id" in properties:
            return str(properties["id"])

        return None

    def _extract_relationship_id(self, relationship: Mapping[str, Any]) -> Optional[str]:
        if "id" in relationship:
            return str(relationship["id"])

        source = relationship.get("source_id") if isinstance(relationship, Mapping) else None
        target = relationship.get("target_id") if isinstance(relationship, Mapping) else None
        rel_type = relationship.get("type")

        if source and target and rel_type:
            return f"{source}->{target}:{rel_type}"

        return None

    def _build_entity_document(self, entity: Mapping[str, Any], entity_id: str) -> Dict[str, Any]:
        properties = dict(entity.get("properties", {})) if isinstance(entity.get("properties"), Mapping) else {}
        now = datetime.now(timezone.utc).isoformat()

        document = {
            "entity_id": entity_id,
            "entity_type": entity.get("type", "Unknown"),
            "name": properties.get("name"),
            "summary": properties.get("summary"),
            "properties": properties,
            "tags": properties.get("tags", []),
            "source": properties.get("source"),
            "ingested_at": now,
        }
        return document

    def _build_relationship_document(self, relationship: Mapping[str, Any], relationship_id: str) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        document = {
            "relationship_id": relationship_id,
            "relationship_type": relationship.get("type", "Unknown"),
            "source_id": relationship.get("source_id"),
            "target_id": relationship.get("target_id"),
            "properties": relationship.get("properties", {}),
            "ingested_at": now,
        }
        return document

    def _is_duplicate(self, bucket: str, doc_id: str, metadata_hash: str) -> bool:
        previous = self.state.get(bucket, {}).get(doc_id)
        if previous == metadata_hash:
            self.logger.debug(
                "Skipping unchanged document",
                extra={"bucket": bucket, "doc_id": doc_id},
            )
            return True
        return False

    def _hash_document(self, document: Mapping[str, Any]) -> str:
        normalized = json.dumps(document, sort_keys=True, default=str)
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def _load_index_definitions(self) -> Dict[str, IndexDefinition]:
        config_path = Path(__file__).resolve().parents[1] / "search" / "config" / "graph_metadata_index.json"
        try:
            with config_path.open("r", encoding="utf-8") as handle:
                config = json.load(handle)
        except FileNotFoundError as exc:
            raise RuntimeError(f"Missing Elasticsearch index config at {config_path}") from exc

        definitions: Dict[str, IndexDefinition] = {}
        for key, payload in config.items():
            definitions[key] = IndexDefinition(
                name=payload["index"],
                aliases=payload.get("aliases", []),
                settings=payload.get("settings", {}),
                mappings=payload.get("mappings", {}),
            )

        return definitions

    def _load_state(self) -> None:
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.state_path.exists():
            self._save_state()
            return

        try:
            with self.state_path.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
                self.state = {
                    "entities": data.get("entities", {}),
                    "relationships": data.get("relationships", {}),
                }
        except json.JSONDecodeError:
            self.logger.warning("State file is corrupt; resetting incremental index state")
            self._save_state()

    def _save_state(self) -> None:
        payload = {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "entities": self.state.get("entities", {}),
            "relationships": self.state.get("relationships", {}),
        }
        with self.state_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, sort_keys=True)

    def _commit_state_updates(self) -> None:
        for bucket, updates in self.pending_state_updates.items():
            self.state.setdefault(bucket, {}).update(updates)
        self._save_state()

    def _clear_state(self) -> None:
        self.state = {"entities": {}, "relationships": {}}
        self.pending_state_updates = {"entities": {}, "relationships": {}}
        if self.state_path.exists():
            self.state_path.unlink()
        self._save_state()


def export_graph_metadata_snapshot(
    entities: Iterable[Mapping[str, Any]],
    relationships: Iterable[Mapping[str, Any]],
    *,
    output_path: Optional[Path] = None,
) -> Path:
    """Persist a snapshot of graph metadata for full reindex runs."""

    entities_list = list(entities)
    relationships_list = list(relationships)
    snapshot_path = output_path or Path(__file__).resolve().parents[1] / "search" / "index" / "graph_metadata_snapshot.json"
    snapshot_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "entity_count": len(entities_list),
        "relationship_count": len(relationships_list),
        "entities": entities_list,
        "relationships": relationships_list,
    }

    with snapshot_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, sort_keys=True)

    LOGGER.info(
        "Graph metadata snapshot written",
        extra={
            "path": str(snapshot_path),
            "entities": len(entities_list),
            "relationships": len(relationships_list),
        },
    )

    return snapshot_path


def load_graph_metadata_snapshot(path: Path) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
    """Load a previously exported graph metadata snapshot."""

    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    entities = payload.get("entities", [])
    relationships = payload.get("relationships", [])
    metadata = {
        "generated_at": payload.get("generated_at"),
        "entity_count": payload.get("entity_count", len(entities)),
        "relationship_count": payload.get("relationship_count", len(relationships)),
    }

    return entities, relationships, metadata
