"""
Neo4j Data Loader for IntelGraph Pipelines
Efficient bulk loading of entities and relationships into Neo4j
"""

import asyncio
from dataclasses import dataclass
from datetime import datetime
from typing import Any

try:
    from neo4j import AsyncGraphDatabase, GraphDatabase
    from neo4j.exceptions import Neo4jError

    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False

from .logging import get_logger


@dataclass
class LoadResult:
    """Result of a Neo4j load operation"""

    entities_processed: int = 0
    entities_loaded: int = 0
    entities_failed: int = 0
    relationships_processed: int = 0
    relationships_loaded: int = 0
    relationships_failed: int = 0
    errors: list[str] = None
    duration_seconds: float = 0

    def __post_init__(self):
        if self.errors is None:
            self.errors = []


class Neo4jLoader:
    """
    Efficient Neo4j data loader with batch processing and error handling
    """

    def __init__(self, uri: str, auth: tuple[str, str], database: str = "neo4j"):
        if not NEO4J_AVAILABLE:
            raise ImportError("neo4j package is required. Install with: pip install neo4j")

        self.uri = uri
        self.auth = auth
        self.database = database
        self.logger = get_logger("neo4j-loader")

        # Driver instance
        self.driver = None

        # Loading configuration
        self.batch_size = 100
        self.max_retries = 3
        self.retry_delay = 1.0

    async def __aenter__(self):
        """Async context manager entry"""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()

    async def connect(self):
        """Connect to Neo4j database"""
        try:
            self.driver = AsyncGraphDatabase.driver(self.uri, auth=self.auth)

            # Test connection
            async with self.driver.session(database=self.database) as session:
                result = await session.run("RETURN 1 as test")
                await result.consume()

            self.logger.info("Connected to Neo4j", uri=self.uri, database=self.database)

        except Exception as e:
            self.logger.error(f"Failed to connect to Neo4j: {e}")
            raise

    async def close(self):
        """Close Neo4j connection"""
        if self.driver:
            await self.driver.close()
            self.logger.info("Disconnected from Neo4j")

    async def load_entities(
        self, entities: list[dict[str, Any]], batch_size: int | None = None
    ) -> LoadResult:
        """
        Load entities into Neo4j using batch processing

        Args:
            entities: List of entity dictionaries
            batch_size: Override default batch size

        Returns:
            LoadResult with statistics
        """
        if not entities:
            return LoadResult()

        batch_size = batch_size or self.batch_size
        result = LoadResult()
        start_time = datetime.now()

        try:
            # Process entities in batches
            for i in range(0, len(entities), batch_size):
                batch = entities[i : i + batch_size]

                batch_result = await self._load_entity_batch(batch)

                # Accumulate results
                result.entities_processed += batch_result.entities_processed
                result.entities_loaded += batch_result.entities_loaded
                result.entities_failed += batch_result.entities_failed
                result.errors.extend(batch_result.errors)

                self.logger.debug(
                    f"Loaded entity batch {i//batch_size + 1}: "
                    f"{batch_result.entities_loaded}/{len(batch)} successful"
                )

            # Calculate duration
            result.duration_seconds = (datetime.now() - start_time).total_seconds()

            self.logger.info(
                "Entity loading completed",
                entities_processed=result.entities_processed,
                entities_loaded=result.entities_loaded,
                entities_failed=result.entities_failed,
                duration_seconds=result.duration_seconds,
            )

        except Exception as e:
            self.logger.error(f"Entity loading failed: {e}")
            result.errors.append(str(e))
            raise

        return result

    async def _load_entity_batch(self, entities: list[dict[str, Any]]) -> LoadResult:
        """
        Load a single batch of entities
        """
        result = LoadResult()

        try:
            async with self.driver.session(database=self.database) as session:
                # Group entities by type for efficient processing
                entities_by_type = {}
                for entity in entities:
                    entity_type = entity.get("type", "Unknown")
                    if entity_type not in entities_by_type:
                        entities_by_type[entity_type] = []
                    entities_by_type[entity_type].append(entity)

                # Process each entity type
                for entity_type, type_entities in entities_by_type.items():
                    type_result = await self._load_entities_of_type(
                        session, entity_type, type_entities
                    )

                    result.entities_processed += type_result.entities_processed
                    result.entities_loaded += type_result.entities_loaded
                    result.entities_failed += type_result.entities_failed
                    result.errors.extend(type_result.errors)

        except Exception as e:
            self.logger.error(f"Batch loading failed: {e}")
            result.errors.append(str(e))
            result.entities_failed += len(entities)

        return result

    async def _load_entities_of_type(
        self, session, entity_type: str, entities: list[dict[str, Any]]
    ) -> LoadResult:
        """
        Load entities of a specific type using UNWIND for efficiency
        """
        result = LoadResult()
        result.entities_processed = len(entities)

        try:
            # Prepare entity data for Cypher
            entity_data = []
            for entity in entities:
                entity_record = {
                    "id": entity.get("id"),
                    "type": entity.get("type"),
                    "label": entity.get("label"),
                    "props": entity.get("props", {}),
                    "createdAt": entity.get("createdAt"),
                    "updatedAt": entity.get("updatedAt", entity.get("createdAt")),
                }
                entity_data.append(entity_record)

            # Build Cypher query using UNWIND for batch processing
            cypher = f"""
            UNWIND $entities AS entityData
            MERGE (e:{entity_type} {{id: entityData.id}})
            SET e.label = entityData.label,
                e.type = entityData.type,
                e.createdAt = datetime(entityData.createdAt),
                e.updatedAt = datetime(entityData.updatedAt),
                e += entityData.props
            RETURN count(e) as created
            """

            # Execute query with retry logic
            for attempt in range(self.max_retries):
                try:
                    query_result = await session.run(cypher, entities=entity_data)
                    summary = await query_result.consume()

                    # Check for successful execution
                    if summary.counters.nodes_created > 0 or summary.counters.properties_set > 0:
                        result.entities_loaded = len(entities)
                        break
                    else:
                        # No changes made, but query succeeded
                        result.entities_loaded = len(entities)
                        break

                except Neo4jError as e:
                    if attempt < self.max_retries - 1:
                        self.logger.warning(
                            f"Neo4j query attempt {attempt + 1} failed, retrying: {e}"
                        )
                        await asyncio.sleep(self.retry_delay * (attempt + 1))
                    else:
                        raise e

            self.logger.debug(f"Loaded {result.entities_loaded} {entity_type} entities")

        except Exception as e:
            self.logger.error(f"Failed to load {entity_type} entities: {e}")
            result.entities_failed = len(entities)
            result.errors.append(f"{entity_type}: {str(e)}")

        return result

    async def load_relationships(
        self, relationships: list[dict[str, Any]], batch_size: int | None = None
    ) -> LoadResult:
        """
        Load relationships into Neo4j

        Args:
            relationships: List of relationship dictionaries with 'from', 'to', 'type'
            batch_size: Override default batch size

        Returns:
            LoadResult with statistics
        """
        if not relationships:
            return LoadResult()

        batch_size = batch_size or self.batch_size
        result = LoadResult()
        start_time = datetime.now()

        try:
            # Process relationships in batches
            for i in range(0, len(relationships), batch_size):
                batch = relationships[i : i + batch_size]

                batch_result = await self._load_relationship_batch(batch)

                # Accumulate results
                result.relationships_processed += batch_result.relationships_processed
                result.relationships_loaded += batch_result.relationships_loaded
                result.relationships_failed += batch_result.relationships_failed
                result.errors.extend(batch_result.errors)

            result.duration_seconds = (datetime.now() - start_time).total_seconds()

            self.logger.info(
                "Relationship loading completed",
                relationships_processed=result.relationships_processed,
                relationships_loaded=result.relationships_loaded,
                relationships_failed=result.relationships_failed,
                duration_seconds=result.duration_seconds,
            )

        except Exception as e:
            self.logger.error(f"Relationship loading failed: {e}")
            result.errors.append(str(e))
            raise

        return result

    async def _load_relationship_batch(self, relationships: list[dict[str, Any]]) -> LoadResult:
        """
        Load a batch of relationships
        """
        result = LoadResult()
        result.relationships_processed = len(relationships)

        try:
            async with self.driver.session(database=self.database) as session:
                # Prepare relationship data
                rel_data = []
                for rel in relationships:
                    rel_record = {
                        "id": rel.get("id"),
                        "from_id": rel.get("from"),
                        "to_id": rel.get("to"),
                        "type": rel.get("type"),
                        "props": rel.get("props", {}),
                        "createdAt": rel.get("createdAt"),
                    }
                    rel_data.append(rel_record)

                # Create relationships using UNWIND
                cypher = """
                UNWIND $relationships AS relData
                MATCH (from {id: relData.from_id})
                MATCH (to {id: relData.to_id})
                CALL apoc.create.relationship(from, relData.type, relData.props, to) YIELD rel
                SET rel.id = relData.id,
                    rel.createdAt = datetime(relData.createdAt)
                RETURN count(rel) as created
                """

                # Execute with retry logic
                for attempt in range(self.max_retries):
                    try:
                        query_result = await session.run(cypher, relationships=rel_data)
                        summary = await query_result.consume()

                        result.relationships_loaded = len(relationships)
                        break

                    except Neo4jError as e:
                        if attempt < self.max_retries - 1:
                            await asyncio.sleep(self.retry_delay * (attempt + 1))
                        else:
                            raise e

        except Exception as e:
            self.logger.error(f"Failed to load relationship batch: {e}")
            result.relationships_failed = len(relationships)
            result.errors.append(str(e))

        return result

    async def create_indexes(self, entity_types: list[str]):
        """
        Create indexes for entity types to improve query performance
        """
        try:
            async with self.driver.session(database=self.database) as session:
                for entity_type in entity_types:
                    # Create index on id property
                    index_cypher = f"CREATE INDEX IF NOT EXISTS FOR (n:{entity_type}) ON (n.id)"
                    await session.run(index_cypher)

                    # Create index on label property for search
                    label_index_cypher = (
                        f"CREATE INDEX IF NOT EXISTS FOR (n:{entity_type}) ON (n.label)"
                    )
                    await session.run(label_index_cypher)

                    self.logger.info(f"Created indexes for {entity_type}")

        except Exception as e:
            self.logger.error(f"Failed to create indexes: {e}")
            raise

    async def get_statistics(self) -> dict[str, Any]:
        """
        Get database statistics
        """
        try:
            async with self.driver.session(database=self.database) as session:
                # Get node counts by label
                node_stats = await session.run(
                    """
                    CALL db.labels() YIELD label
                    CALL apoc.cypher.run('MATCH (n:' + label + ') RETURN count(n) as count', {})
                    YIELD value
                    RETURN label, value.count as count
                """
                )

                nodes_by_type = {}
                async for record in node_stats:
                    nodes_by_type[record["label"]] = record["count"]

                # Get relationship counts by type
                rel_stats = await session.run(
                    """
                    CALL db.relationshipTypes() YIELD relationshipType
                    CALL apoc.cypher.run('MATCH ()-[r:' + relationshipType + ']-() RETURN count(r) as count', {})
                    YIELD value
                    RETURN relationshipType, value.count as count
                """
                )

                rels_by_type = {}
                async for record in rel_stats:
                    rels_by_type[record["relationshipType"]] = record["count"]

                return {
                    "nodes_by_type": nodes_by_type,
                    "relationships_by_type": rels_by_type,
                    "total_nodes": sum(nodes_by_type.values()),
                    "total_relationships": sum(rels_by_type.values()),
                }

        except Exception as e:
            self.logger.error(f"Failed to get statistics: {e}")
            return {}


# Utility function for quick loading
async def load_data_to_neo4j(
    uri: str,
    auth: tuple[str, str],
    entities: list[dict[str, Any]] = None,
    relationships: list[dict[str, Any]] = None,
    database: str = "neo4j",
) -> LoadResult:
    """
    Convenience function for loading data to Neo4j
    """
    async with Neo4jLoader(uri, auth, database) as loader:
        combined_result = LoadResult()

        if entities:
            entity_result = await loader.load_entities(entities)
            combined_result.entities_processed = entity_result.entities_processed
            combined_result.entities_loaded = entity_result.entities_loaded
            combined_result.entities_failed = entity_result.entities_failed
            combined_result.errors.extend(entity_result.errors)

        if relationships:
            rel_result = await loader.load_relationships(relationships)
            combined_result.relationships_processed = rel_result.relationships_processed
            combined_result.relationships_loaded = rel_result.relationships_loaded
            combined_result.relationships_failed = rel_result.relationships_failed
            combined_result.errors.extend(rel_result.errors)

        return combined_result
