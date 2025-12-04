"""
Neo4j Aggregator for Federated Learning

Implements graph-based storage and aggregation of federated
learning results with support for OSINT entity relationships.
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class AggregationConfig:
    """Configuration for Neo4j aggregation"""

    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = ""
    database: str = "neo4j"

    # Aggregation settings
    merge_strategy: str = "weighted_average"
    conflict_resolution: str = "latest_wins"
    store_provenance: bool = True
    store_embeddings: bool = True

    # Graph settings
    entity_label: str = "OSINTEntity"
    relationship_type: str = "RELATED_TO"
    model_label: str = "FederatedModel"


@dataclass
class FederatedGraphResult:
    """Result from federated graph aggregation"""

    result_id: str
    round_number: int
    aggregated_entities: int
    aggregated_relationships: int
    contributing_nodes: List[str]
    metrics: Dict[str, float]
    timestamp: float
    graph_stats: Dict[str, Any] = field(default_factory=dict)


class Neo4jAggregator:
    """
    Neo4j-based Aggregator for Federated Learning

    Features:
    - Graph-aware model aggregation
    - OSINT entity relationship storage
    - Provenance tracking
    - Federated embedding storage
    """

    def __init__(self, config: AggregationConfig):
        self.config = config
        self._driver = None
        self._connected = False

        # Connect if credentials provided
        if config.neo4j_password:
            self._connect()

        logger.info(f"Neo4j aggregator initialized - uri={config.neo4j_uri}")

    def _connect(self) -> None:
        """Connect to Neo4j"""
        try:
            from neo4j import GraphDatabase

            self._driver = GraphDatabase.driver(
                self.config.neo4j_uri,
                auth=(self.config.neo4j_user, self.config.neo4j_password),
            )

            # Verify connection
            with self._driver.session(database=self.config.database) as session:
                session.run("RETURN 1")

            self._connected = True
            self._setup_schema()

            logger.info("Connected to Neo4j successfully")

        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            self._connected = False

    def _setup_schema(self) -> None:
        """Setup Neo4j schema for federated learning"""
        if not self._connected:
            return

        with self._driver.session(database=self.config.database) as session:
            # Create constraints and indexes
            session.run(f"""
                CREATE CONSTRAINT IF NOT EXISTS FOR (e:{self.config.entity_label})
                REQUIRE e.entity_id IS UNIQUE
            """)

            session.run(f"""
                CREATE CONSTRAINT IF NOT EXISTS FOR (m:{self.config.model_label})
                REQUIRE m.model_id IS UNIQUE
            """)

            session.run("""
                CREATE INDEX IF NOT EXISTS FOR (n:FederatedNode)
                ON (n.node_id)
            """)

            session.run("""
                CREATE INDEX IF NOT EXISTS FOR (r:TrainingRound)
                ON (r.round_number)
            """)

    def store_training_round(
        self,
        round_number: int,
        metrics: Dict[str, float],
        contributing_nodes: List[str],
        model_parameters_hash: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Store training round results in Neo4j"""
        round_id = f"round_{round_number}_{int(time.time())}"

        if not self._connected:
            logger.warning("Not connected to Neo4j - skipping storage")
            return round_id

        with self._driver.session(database=self.config.database) as session:
            # Create training round node
            session.run(
                """
                CREATE (r:TrainingRound {
                    round_id: $round_id,
                    round_number: $round_number,
                    accuracy: $accuracy,
                    loss: $loss,
                    model_hash: $model_hash,
                    num_contributors: $num_contributors,
                    created_at: datetime()
                })
                """,
                round_id=round_id,
                round_number=round_number,
                accuracy=metrics.get("accuracy", 0),
                loss=metrics.get("loss", 0),
                model_hash=model_parameters_hash,
                num_contributors=len(contributing_nodes),
            )

            # Link to contributing nodes
            for node_id in contributing_nodes:
                session.run(
                    """
                    MERGE (n:FederatedNode {node_id: $node_id})
                    WITH n
                    MATCH (r:TrainingRound {round_id: $round_id})
                    CREATE (n)-[:CONTRIBUTED_TO {
                        timestamp: datetime()
                    }]->(r)
                    """,
                    node_id=node_id,
                    round_id=round_id,
                )

            # Link to previous round if exists
            if round_number > 1:
                session.run(
                    """
                    MATCH (current:TrainingRound {round_number: $current_round})
                    MATCH (prev:TrainingRound {round_number: $prev_round})
                    CREATE (current)-[:FOLLOWS]->(prev)
                    """,
                    current_round=round_number,
                    prev_round=round_number - 1,
                )

        logger.info(f"Stored training round {round_number} in Neo4j")

        return round_id

    def store_osint_entities(
        self,
        entities: List[Dict[str, Any]],
        source_node: str,
        round_number: int,
    ) -> int:
        """Store OSINT entities discovered during federated training"""
        if not self._connected:
            logger.warning("Not connected to Neo4j - skipping entity storage")
            return 0

        stored_count = 0

        with self._driver.session(database=self.config.database) as session:
            for entity in entities:
                try:
                    session.run(
                        f"""
                        MERGE (e:{self.config.entity_label} {{entity_id: $entity_id}})
                        ON CREATE SET
                            e.name = $name,
                            e.type = $type,
                            e.confidence = $confidence,
                            e.source_node = $source_node,
                            e.discovered_round = $round_number,
                            e.created_at = datetime()
                        ON MATCH SET
                            e.confidence = CASE
                                WHEN e.confidence < $confidence THEN $confidence
                                ELSE e.confidence
                            END,
                            e.updated_at = datetime()

                        WITH e
                        MATCH (r:TrainingRound {{round_number: $round_number}})
                        MERGE (e)-[:DISCOVERED_IN]->(r)

                        WITH e
                        MERGE (n:FederatedNode {{node_id: $source_node}})
                        MERGE (n)-[:DISCOVERED]->(e)
                        """,
                        entity_id=entity.get("id", f"entity_{time.time()}"),
                        name=entity.get("name", "Unknown"),
                        type=entity.get("type", "Unknown"),
                        confidence=entity.get("confidence", 0.5),
                        source_node=source_node,
                        round_number=round_number,
                    )
                    stored_count += 1

                except Exception as e:
                    logger.error(f"Failed to store entity: {e}")

        logger.info(f"Stored {stored_count} OSINT entities")

        return stored_count

    def store_entity_relationships(
        self,
        relationships: List[Dict[str, Any]],
        source_node: str,
        round_number: int,
    ) -> int:
        """Store relationships between OSINT entities"""
        if not self._connected:
            return 0

        stored_count = 0

        with self._driver.session(database=self.config.database) as session:
            for rel in relationships:
                try:
                    session.run(
                        f"""
                        MATCH (source:{self.config.entity_label} {{entity_id: $source_id}})
                        MATCH (target:{self.config.entity_label} {{entity_id: $target_id}})
                        MERGE (source)-[r:{self.config.relationship_type} {{
                            relationship_type: $rel_type
                        }}]->(target)
                        ON CREATE SET
                            r.confidence = $confidence,
                            r.source_node = $source_node,
                            r.discovered_round = $round_number,
                            r.created_at = datetime()
                        ON MATCH SET
                            r.confidence = CASE
                                WHEN r.confidence < $confidence THEN $confidence
                                ELSE r.confidence
                            END,
                            r.updated_at = datetime()
                        """,
                        source_id=rel.get("source"),
                        target_id=rel.get("target"),
                        rel_type=rel.get("type", "RELATED_TO"),
                        confidence=rel.get("confidence", 0.5),
                        source_node=source_node,
                        round_number=round_number,
                    )
                    stored_count += 1

                except Exception as e:
                    logger.error(f"Failed to store relationship: {e}")

        logger.info(f"Stored {stored_count} entity relationships")

        return stored_count

    def aggregate_entity_embeddings(
        self,
        entity_id: str,
        embeddings: List[Tuple[str, np.ndarray]],  # (node_id, embedding)
        aggregation_method: str = "weighted_average",
    ) -> np.ndarray:
        """Aggregate embeddings for an entity from multiple nodes"""
        if not embeddings:
            raise ValueError("No embeddings to aggregate")

        if aggregation_method == "weighted_average":
            # Weight by inverse distance from mean
            all_embeddings = np.array([e for _, e in embeddings])
            mean = np.mean(all_embeddings, axis=0)
            distances = np.linalg.norm(all_embeddings - mean, axis=1)

            # Avoid division by zero
            weights = 1 / (distances + 1e-6)
            weights = weights / weights.sum()

            aggregated = np.average(all_embeddings, axis=0, weights=weights)

        elif aggregation_method == "mean":
            aggregated = np.mean([e for _, e in embeddings], axis=0)

        elif aggregation_method == "median":
            aggregated = np.median([e for _, e in embeddings], axis=0)

        else:
            raise ValueError(f"Unknown aggregation method: {aggregation_method}")

        # Normalize
        norm = np.linalg.norm(aggregated)
        if norm > 0:
            aggregated = aggregated / norm

        # Store aggregated embedding
        if self._connected and self.config.store_embeddings:
            self._store_entity_embedding(entity_id, aggregated, embeddings)

        return aggregated

    def _store_entity_embedding(
        self,
        entity_id: str,
        embedding: np.ndarray,
        sources: List[Tuple[str, np.ndarray]],
    ) -> None:
        """Store entity embedding in Neo4j"""
        with self._driver.session(database=self.config.database) as session:
            session.run(
                f"""
                MATCH (e:{self.config.entity_label} {{entity_id: $entity_id}})
                SET e.embedding = $embedding,
                    e.embedding_sources = $sources,
                    e.embedding_updated = datetime()
                """,
                entity_id=entity_id,
                embedding=embedding.tolist(),
                sources=[s[0] for s in sources],
            )

    def get_training_lineage(
        self,
        round_number: int,
    ) -> List[Dict[str, Any]]:
        """Get training lineage for a round"""
        if not self._connected:
            return []

        with self._driver.session(database=self.config.database) as session:
            result = session.run(
                """
                MATCH path = (r:TrainingRound {round_number: $round_number})-[:FOLLOWS*]->(ancestor:TrainingRound)
                RETURN r, collect(ancestor) as ancestors
                """,
                round_number=round_number,
            )

            records = list(result)
            if not records:
                return []

            lineage = []
            for record in records:
                lineage.append({
                    "round": dict(record["r"]),
                    "ancestors": [dict(a) for a in record["ancestors"]],
                })

            return lineage

    def get_node_contributions(
        self,
        node_id: str,
    ) -> Dict[str, Any]:
        """Get contribution summary for a federated node"""
        if not self._connected:
            return {}

        with self._driver.session(database=self.config.database) as session:
            result = session.run(
                """
                MATCH (n:FederatedNode {node_id: $node_id})
                OPTIONAL MATCH (n)-[:CONTRIBUTED_TO]->(r:TrainingRound)
                OPTIONAL MATCH (n)-[:DISCOVERED]->(e:OSINTEntity)
                RETURN n,
                       count(DISTINCT r) as rounds_contributed,
                       collect(DISTINCT r.round_number) as round_numbers,
                       count(DISTINCT e) as entities_discovered
                """,
                node_id=node_id,
            )

            record = result.single()
            if not record:
                return {}

            return {
                "node_id": node_id,
                "rounds_contributed": record["rounds_contributed"],
                "round_numbers": record["round_numbers"],
                "entities_discovered": record["entities_discovered"],
            }

    def get_federated_graph_stats(self) -> Dict[str, Any]:
        """Get statistics about the federated learning graph"""
        if not self._connected:
            return {}

        with self._driver.session(database=self.config.database) as session:
            result = session.run(
                f"""
                MATCH (r:TrainingRound)
                WITH count(r) as total_rounds, max(r.round_number) as latest_round

                MATCH (n:FederatedNode)
                WITH total_rounds, latest_round, count(n) as total_nodes

                MATCH (e:{self.config.entity_label})
                WITH total_rounds, latest_round, total_nodes, count(e) as total_entities

                MATCH ()-[rel:{self.config.relationship_type}]->()
                RETURN total_rounds, latest_round, total_nodes, total_entities, count(rel) as total_relationships
                """
            )

            record = result.single()
            if not record:
                return {
                    "total_rounds": 0,
                    "latest_round": 0,
                    "total_nodes": 0,
                    "total_entities": 0,
                    "total_relationships": 0,
                }

            return {
                "total_rounds": record["total_rounds"],
                "latest_round": record["latest_round"],
                "total_nodes": record["total_nodes"],
                "total_entities": record["total_entities"],
                "total_relationships": record["total_relationships"],
            }

    def query_similar_entities(
        self,
        embedding: np.ndarray,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Query entities similar to given embedding"""
        if not self._connected:
            return []

        with self._driver.session(database=self.config.database) as session:
            result = session.run(
                f"""
                MATCH (e:{self.config.entity_label})
                WHERE e.embedding IS NOT NULL
                WITH e, gds.similarity.cosine(e.embedding, $embedding) as similarity
                ORDER BY similarity DESC
                LIMIT $limit
                RETURN e.entity_id as id, e.name as name, e.type as type,
                       e.confidence as confidence, similarity
                """,
                embedding=embedding.tolist(),
                limit=limit,
            )

            return [dict(record) for record in result]

    def close(self) -> None:
        """Close Neo4j connection"""
        if self._driver:
            self._driver.close()
            self._connected = False
            logger.info("Neo4j connection closed")
