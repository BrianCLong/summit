"""
Idempotent Data Loader with Merge Strategies
Ensures retries never create duplicates and provides various merge strategies
"""

import hashlib
import json
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any

try:
    from neo4j import AsyncGraphDatabase

    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False

from ..utils.logging import get_logger


class MergeStrategy(Enum):
    """Strategies for merging duplicate entities"""

    REPLACE = "replace"  # Replace existing with new
    MERGE_PROPS = "merge_props"  # Merge properties, new overwrites old
    KEEP_LATEST = "keep_latest"  # Keep the record with latest timestamp
    KEEP_EARLIEST = "keep_earliest"  # Keep the record with earliest timestamp
    CUSTOM = "custom"  # Use custom merge function


@dataclass
class LoadResult:
    """Result of idempotent load operation"""

    records_processed: int
    records_created: int
    records_updated: int
    records_skipped: int
    records_failed: int
    merge_conflicts_resolved: int
    processing_time_seconds: float
    errors: list[str]


class IdempotentLoader:
    """
    Idempotent loader that ensures data consistency across retries and provides merge strategies
    """

    def __init__(
        self,
        neo4j_uri: str,
        neo4j_auth: tuple[str, str],
        database: str = "neo4j",
        default_merge_strategy: MergeStrategy = MergeStrategy.MERGE_PROPS,
    ):

        if not NEO4J_AVAILABLE:
            raise ImportError("neo4j package is required")

        self.neo4j_uri = neo4j_uri
        self.neo4j_auth = neo4j_auth
        self.database = database
        self.default_merge_strategy = default_merge_strategy
        self.logger = get_logger("idempotent-loader")

        # Custom merge functions
        self.custom_merge_functions: dict[str, Callable] = {}

        # Driver instance
        self.driver = None

    async def __aenter__(self):
        """Async context manager entry"""
        self.driver = AsyncGraphDatabase.driver(self.neo4j_uri, auth=self.neo4j_auth)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.driver:
            await self.driver.close()

    def register_custom_merge(self, entity_type: str, merge_function: Callable):
        """Register a custom merge function for specific entity type"""
        self.custom_merge_functions[entity_type] = merge_function
        self.logger.info(f"Registered custom merge function for {entity_type}")

    async def load_entities_idempotent(
        self,
        entities: list[dict[str, Any]],
        batch_size: int = 100,
        merge_strategy: MergeStrategy | None = None,
    ) -> LoadResult:
        """
        Load entities with idempotent guarantees

        Args:
            entities: List of entity dictionaries with 'id', 'type', 'label', 'props'
            batch_size: Number of entities to process in each batch
            merge_strategy: Strategy for handling conflicts (uses default if None)

        Returns:
            LoadResult with statistics
        """
        if not self.driver:
            raise RuntimeError("Driver not initialized. Use async context manager.")

        start_time = datetime.now()
        result = LoadResult(
            records_processed=0,
            records_created=0,
            records_updated=0,
            records_skipped=0,
            records_failed=0,
            merge_conflicts_resolved=0,
            processing_time_seconds=0.0,
            errors=[],
        )

        merge_strategy = merge_strategy or self.default_merge_strategy

        try:
            # Process entities in batches
            for i in range(0, len(entities), batch_size):
                batch = entities[i : i + batch_size]
                batch_result = await self._load_entity_batch(batch, merge_strategy)

                # Accumulate results
                result.records_processed += batch_result.records_processed
                result.records_created += batch_result.records_created
                result.records_updated += batch_result.records_updated
                result.records_skipped += batch_result.records_skipped
                result.records_failed += batch_result.records_failed
                result.merge_conflicts_resolved += batch_result.merge_conflicts_resolved
                result.errors.extend(batch_result.errors)

                self.logger.debug(f"Processed batch {i//batch_size + 1}: {len(batch)} entities")

            end_time = datetime.now()
            result.processing_time_seconds = (end_time - start_time).total_seconds()

            self.logger.info(
                f"Idempotent load completed: {result.records_processed} processed, "
                f"{result.records_created} created, {result.records_updated} updated, "
                f"{result.records_failed} failed in {result.processing_time_seconds:.2f}s"
            )

        except Exception as e:
            self.logger.error(f"Idempotent load failed: {e}")
            result.errors.append(str(e))
            raise

        return result

    async def _load_entity_batch(
        self, entities: list[dict[str, Any]], merge_strategy: MergeStrategy
    ) -> LoadResult:
        """Load a batch of entities with idempotent logic"""
        result = LoadResult(
            records_processed=len(entities),
            records_created=0,
            records_updated=0,
            records_skipped=0,
            records_failed=0,
            merge_conflicts_resolved=0,
            processing_time_seconds=0.0,
            errors=[],
        )

        async with self.driver.session(database=self.database) as session:
            for entity in entities:
                try:
                    entity_result = await self._load_single_entity(session, entity, merge_strategy)

                    if entity_result == "created":
                        result.records_created += 1
                    elif entity_result == "updated":
                        result.records_updated += 1
                        result.merge_conflicts_resolved += 1
                    elif entity_result == "skipped":
                        result.records_skipped += 1

                except Exception as e:
                    result.records_failed += 1
                    result.errors.append(f"Entity {entity.get('id', 'unknown')}: {str(e)}")
                    self.logger.error(f"Failed to load entity {entity.get('id')}: {e}")

        return result

    async def _load_single_entity(
        self, session, entity: dict[str, Any], merge_strategy: MergeStrategy
    ) -> str:
        """Load a single entity with merge logic"""
        entity_id = entity.get("id")
        entity_type = entity.get("type")
        entity_label = entity.get("label", "")
        entity_props = entity.get("props", {})

        if not entity_id or not entity_type:
            raise ValueError("Entity must have 'id' and 'type' fields")

        # Generate content hash for change detection
        content_hash = self._generate_content_hash(entity)

        # Check if entity exists and get current state
        existing_entity = await self._get_existing_entity(session, entity_id, entity_type)

        if not existing_entity:
            # Entity doesn't exist, create it
            await self._create_entity(session, entity, content_hash)
            return "created"

        # Entity exists, check if update is needed
        existing_hash = existing_entity.get("_content_hash")
        if existing_hash == content_hash:
            # No changes needed
            return "skipped"

        # Apply merge strategy
        merged_entity = await self._apply_merge_strategy(existing_entity, entity, merge_strategy)

        # Update entity with merged data
        await self._update_entity(session, entity_id, entity_type, merged_entity, content_hash)
        return "updated"

    async def _get_existing_entity(
        self, session, entity_id: str, entity_type: str
    ) -> dict[str, Any] | None:
        """Get existing entity from Neo4j"""
        cypher = f"""
        MATCH (n:{entity_type} {{id: $entity_id}})
        RETURN n.id as id, 
               n.type as type, 
               n.label as label,
               n._content_hash as _content_hash,
               n._updated_at as _updated_at,
               n._created_at as _created_at,
               properties(n) as props
        """

        result = await session.run(cypher, entity_id=entity_id)
        record = await result.single()

        if record:
            return {
                "id": record["id"],
                "type": record["type"],
                "label": record["label"],
                "props": record["props"],
                "_content_hash": record["_content_hash"],
                "_updated_at": record["_updated_at"],
                "_created_at": record["_created_at"],
            }

        return None

    async def _create_entity(self, session, entity: dict[str, Any], content_hash: str):
        """Create a new entity in Neo4j"""
        entity_type = entity["type"]
        entity_id = entity["id"]
        entity_label = entity.get("label", "")
        entity_props = entity.get("props", {})

        # Add metadata properties
        metadata_props = {
            "_content_hash": content_hash,
            "_created_at": datetime.now().isoformat(),
            "_updated_at": datetime.now().isoformat(),
            "_version": 1,
        }

        # Merge entity props with metadata
        all_props = {**entity_props, **metadata_props}

        cypher = f"""
        CREATE (n:{entity_type})
        SET n.id = $entity_id,
            n.type = $entity_type,
            n.label = $entity_label,
            n += $props
        RETURN n.id as created_id
        """

        await session.run(
            cypher,
            entity_id=entity_id,
            entity_type=entity_type,
            entity_label=entity_label,
            props=all_props,
        )

        self.logger.debug(f"Created entity {entity_id} of type {entity_type}")

    async def _update_entity(
        self,
        session,
        entity_id: str,
        entity_type: str,
        merged_entity: dict[str, Any],
        content_hash: str,
    ):
        """Update an existing entity in Neo4j"""

        # Update metadata
        merged_props = merged_entity.get("props", {})
        merged_props.update(
            {
                "_content_hash": content_hash,
                "_updated_at": datetime.now().isoformat(),
                "_version": merged_props.get("_version", 1) + 1,
            }
        )

        cypher = f"""
        MATCH (n:{entity_type} {{id: $entity_id}})
        SET n.label = $entity_label,
            n += $props
        RETURN n.id as updated_id
        """

        await session.run(
            cypher,
            entity_id=entity_id,
            entity_label=merged_entity.get("label", ""),
            props=merged_props,
        )

        self.logger.debug(f"Updated entity {entity_id} of type {entity_type}")

    async def _apply_merge_strategy(
        self, existing: dict[str, Any], new: dict[str, Any], strategy: MergeStrategy
    ) -> dict[str, Any]:
        """Apply merge strategy to resolve conflicts"""

        if strategy == MergeStrategy.REPLACE:
            return new

        elif strategy == MergeStrategy.MERGE_PROPS:
            merged = existing.copy()
            merged["label"] = new.get("label", existing.get("label", ""))

            # Merge properties, new values override existing
            existing_props = existing.get("props", {})
            new_props = new.get("props", {})
            merged_props = {**existing_props, **new_props}
            merged["props"] = merged_props

            return merged

        elif strategy == MergeStrategy.KEEP_LATEST:
            existing_updated = existing.get("_updated_at", existing.get("_created_at", ""))
            new_updated = new.get("props", {}).get("updated_at", datetime.now().isoformat())

            if new_updated > existing_updated:
                return new
            else:
                return existing

        elif strategy == MergeStrategy.KEEP_EARLIEST:
            existing_created = existing.get("_created_at", datetime.now().isoformat())
            new_created = new.get("props", {}).get("created_at", datetime.now().isoformat())

            if new_created < existing_created:
                return new
            else:
                return existing

        elif strategy == MergeStrategy.CUSTOM:
            entity_type = existing.get("type")
            if entity_type in self.custom_merge_functions:
                merge_func = self.custom_merge_functions[entity_type]
                return merge_func(existing, new)
            else:
                # Fallback to merge_props if no custom function
                return await self._apply_merge_strategy(existing, new, MergeStrategy.MERGE_PROPS)

        else:
            # Default to merge_props
            return await self._apply_merge_strategy(existing, new, MergeStrategy.MERGE_PROPS)

    def _generate_content_hash(self, entity: dict[str, Any]) -> str:
        """Generate a hash of entity content for change detection"""
        # Create a normalized representation of the entity
        content = {
            "type": entity.get("type"),
            "label": entity.get("label", ""),
            "props": entity.get("props", {}),
        }

        # Remove any internal metadata fields
        if "props" in content:
            content["props"] = {k: v for k, v in content["props"].items() if not k.startswith("_")}

        # Create deterministic JSON string
        content_str = json.dumps(content, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(content_str.encode()).hexdigest()

    async def load_relationships_idempotent(
        self, relationships: list[dict[str, Any]], batch_size: int = 100
    ) -> LoadResult:
        """Load relationships with idempotent guarantees"""

        if not self.driver:
            raise RuntimeError("Driver not initialized")

        start_time = datetime.now()
        result = LoadResult(
            records_processed=len(relationships),
            records_created=0,
            records_updated=0,
            records_skipped=0,
            records_failed=0,
            merge_conflicts_resolved=0,
            processing_time_seconds=0.0,
            errors=[],
        )

        try:
            async with self.driver.session(database=self.database) as session:
                for i in range(0, len(relationships), batch_size):
                    batch = relationships[i : i + batch_size]
                    await self._load_relationship_batch(session, batch, result)

            end_time = datetime.now()
            result.processing_time_seconds = (end_time - start_time).total_seconds()

            self.logger.info(
                f"Relationship load completed: {result.records_processed} processed, "
                f"{result.records_created} created, {result.records_updated} updated"
            )

        except Exception as e:
            self.logger.error(f"Relationship load failed: {e}")
            result.errors.append(str(e))
            raise

        return result

    async def _load_relationship_batch(
        self, session, relationships: list[dict[str, Any]], result: LoadResult
    ):
        """Load a batch of relationships"""

        for relationship in relationships:
            try:
                rel_id = relationship.get("id")
                from_id = relationship.get("from")
                to_id = relationship.get("to")
                rel_type = relationship.get("type")
                rel_props = relationship.get("props", {})

                if not all([rel_id, from_id, to_id, rel_type]):
                    result.records_failed += 1
                    result.errors.append(f"Relationship missing required fields: {relationship}")
                    continue

                # Generate content hash
                content_hash = self._generate_content_hash(relationship)

                # Check if relationship exists
                existing_rel = await self._get_existing_relationship(session, rel_id, rel_type)

                if not existing_rel:
                    # Create new relationship
                    await self._create_relationship(session, relationship, content_hash)
                    result.records_created += 1
                else:
                    # Check if update needed
                    existing_hash = existing_rel.get("_content_hash")
                    if existing_hash != content_hash:
                        await self._update_relationship(session, relationship, content_hash)
                        result.records_updated += 1
                    else:
                        result.records_skipped += 1

            except Exception as e:
                result.records_failed += 1
                result.errors.append(f"Relationship {relationship.get('id', 'unknown')}: {str(e)}")

    async def _get_existing_relationship(
        self, session, rel_id: str, rel_type: str
    ) -> dict[str, Any] | None:
        """Get existing relationship from Neo4j"""
        cypher = f"""
        MATCH ()-[r:{rel_type} {{id: $rel_id}}]-()
        RETURN r.id as id,
               r._content_hash as _content_hash,
               properties(r) as props
        """

        result = await session.run(cypher, rel_id=rel_id)
        record = await result.single()

        if record:
            return {
                "id": record["id"],
                "props": record["props"],
                "_content_hash": record["_content_hash"],
            }

        return None

    async def _create_relationship(self, session, relationship: dict[str, Any], content_hash: str):
        """Create a new relationship in Neo4j"""
        rel_id = relationship["id"]
        from_id = relationship["from"]
        to_id = relationship["to"]
        rel_type = relationship["type"]
        rel_props = relationship.get("props", {})

        # Add metadata
        metadata_props = {
            "_content_hash": content_hash,
            "_created_at": datetime.now().isoformat(),
            "_version": 1,
        }

        all_props = {**rel_props, **metadata_props}

        cypher = f"""
        MATCH (from {{id: $from_id}})
        MATCH (to {{id: $to_id}})
        CREATE (from)-[r:{rel_type}]->(to)
        SET r.id = $rel_id,
            r += $props
        RETURN r.id as created_id
        """

        await session.run(cypher, from_id=from_id, to_id=to_id, rel_id=rel_id, props=all_props)

    async def _update_relationship(self, session, relationship: dict[str, Any], content_hash: str):
        """Update an existing relationship"""
        rel_id = relationship["id"]
        rel_type = relationship["type"]
        rel_props = relationship.get("props", {})

        # Update metadata
        rel_props.update({"_content_hash": content_hash, "_updated_at": datetime.now().isoformat()})

        cypher = f"""
        MATCH ()-[r:{rel_type} {{id: $rel_id}}]-()
        SET r += $props,
            r._version = coalesce(r._version, 0) + 1
        RETURN r.id as updated_id
        """

        await session.run(cypher, rel_id=rel_id, props=rel_props)


# Custom merge functions for common patterns
def merge_person_entities(existing: dict[str, Any], new: dict[str, Any]) -> dict[str, Any]:
    """Custom merge function for person entities"""
    merged = existing.copy()

    # Take the longest name as canonical
    existing_name = existing.get("label", "")
    new_name = new.get("label", "")
    if len(new_name) > len(existing_name):
        merged["label"] = new_name

    # Merge properties with preference for more complete data
    existing_props = existing.get("props", {})
    new_props = new.get("props", {})
    merged_props = existing_props.copy()

    # Email - prefer the one that looks more official
    if "email" in new_props:
        new_email = new_props["email"]
        existing_email = existing_props.get("email", "")

        if not existing_email or ("@gmail.com" in existing_email and "@gmail.com" not in new_email):
            merged_props["email"] = new_email

    # Phone - prefer the one with country code
    if "phone" in new_props:
        new_phone = new_props["phone"]
        if new_phone.startswith("+") and not existing_props.get("phone", "").startswith("+"):
            merged_props["phone"] = new_phone

    # Organization - prefer non-null values
    for field in ["organization", "title", "location"]:
        if field in new_props and new_props[field]:
            if not existing_props.get(field):
                merged_props[field] = new_props[field]

    merged["props"] = merged_props
    return merged


def merge_organization_entities(existing: dict[str, Any], new: dict[str, Any]) -> dict[str, Any]:
    """Custom merge function for organization entities"""
    merged = existing.copy()

    # Take the more complete name
    existing_name = existing.get("label", "")
    new_name = new.get("label", "")

    # Prefer name without abbreviations
    if "." not in new_name and "." in existing_name:
        merged["label"] = new_name
    elif len(new_name) > len(existing_name):
        merged["label"] = new_name

    # Merge properties
    existing_props = existing.get("props", {})
    new_props = new.get("props", {})
    merged_props = existing_props.copy()

    # Domain - prefer the one that matches company name better
    if "domain" in new_props:
        merged_props["domain"] = new_props["domain"]

    # Industry, size, etc. - prefer non-null
    for field in ["industry", "size", "website", "headquarters"]:
        if field in new_props and new_props[field]:
            merged_props[field] = new_props[field]

    merged["props"] = merged_props
    return merged
