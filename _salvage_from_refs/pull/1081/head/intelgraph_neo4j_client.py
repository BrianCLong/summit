import logging

import redis
from neo4j import GraphDatabase, basic_auth
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class IntelGraphNeo4jClient:
    """
    A client for interacting with the IntelGraph Neo4j graph database.
    Provides methods for creating and managing nodes (entities) and relationships.
    """

    def __init__(self, config: dict, redis_client: redis.Redis | None = None):
        self.config = config
        self.uri = config["neo4j_uri"]
        self.username = config["neo4j_username"]
        self.password = config["neo4j_password"]
        self.driver = None
        self.redis = redis_client
        self._initialize_driver()

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True,  # Re-raise the last exception after retries are exhausted
    )
    def _initialize_driver(self):
        """
        Initializes the Neo4j driver.
        """
        logger.info(f"Initializing Neo4j driver for URI: {self.uri}")
        try:
            self.driver = GraphDatabase.driver(
                self.uri, auth=basic_auth(self.username, self.password)
            )
            self.driver.verify_connectivity()
            logger.info("Neo4j driver initialized and connected successfully.")
        except Exception as e:
            logger.info(f"Error initializing Neo4j driver or connecting: {e}")
            raise

    def close(self):
        """
        Closes the Neo4j driver connection.
        """
        if self.driver:
            self.driver.close()
            logger.info("Neo4j driver closed.")

    @retry(
        stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=1, max=10), reraise=True
    )
    def create_or_update_entity(self, label: str, properties: dict) -> dict:
        """
        Creates or updates an entity (node) in the graph.
        `label` should be one of: Person, Organization, Meme, Channel, Event, Country.
        `properties` must include a unique identifier (e.g., 'id' or 'name').
        """
        if not properties or not any(key in properties for key in ["id", "name", "canonical_id"]):
            raise ValueError("Properties must contain a unique identifier.")

        canonical_id = properties.get("canonical_id")
        if not canonical_id:
            unique_key = properties.get("id") or properties.get("name")
            if self.redis and unique_key:
                cached = self.redis.get(unique_key)
                if cached:
                    canonical_id = cached.decode() if isinstance(cached, bytes) else cached
            if not canonical_id:
                canonical_id = unique_key
            properties["canonical_id"] = canonical_id

        query = (
            "MERGE (e:Entity {canonical_id: $canonical_id}) "
            f"SET e:{label} "
            "SET e += $properties "
            "RETURN e"
        )
        logger.debug(f"Executing Neo4j query: {query} with properties: {properties}")
        try:
            with self.driver.session() as session:
                result = session.write_transaction(
                    lambda tx: tx.run(
                        query, canonical_id=canonical_id, properties=properties
                    ).single()
                )
                if result:
                    logger.info(f"Created/Updated {label} entity: {canonical_id}")
                    return result["e"]._properties
                return None
        except Exception as e:
            logger.info(
                f"Error creating/updating {label} entity {canonical_id}: {e}", exc_info=True
            )
            raise

    @retry(
        stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=1, max=10), reraise=True
    )
    def create_relationship(
        self,
        source_label: str,
        source_id_key: str,
        source_id_value: str,
        target_label: str,
        target_id_key: str,
        target_id_value: str,
        relationship_type: str,
        properties: dict = None,
    ) -> dict:
        """
        Creates a relationship between two entities.
        `relationship_type` should be one of: supports, undermines, links_to, derived_from, responds_to.
        `properties` can include timestamp, confidence, source metadata.
        """
        if properties is None:
            properties = {}

        query = (
            f"MATCH (a:{source_label} {{ {source_id_key}: $source_id_value }}) "
            f"MATCH (b:{target_label} {{ {target_id_key}: $target_id_value }}) "
            f"MERGE (a)-[r:{relationship_type}]->(b) "
            "SET r += $properties "
            "RETURN r"
        )
        logger.debug(f"Executing Neo4j query: {query} with properties: {properties}")
        try:
            with self.driver.session() as session:
                result = session.write_transaction(
                    lambda tx: tx.run(
                        query,
                        source_id_value=source_id_value,
                        target_id_value=target_id_value,
                        properties=properties,
                    ).single()
                )
                if result:
                    logger.info(
                        f"Created/Updated relationship {source_id_value}-[{relationship_type}]->{target_id_value}"
                    )
                    return result["r"]._properties
                return None
        except Exception as e:
            logger.info(
                f"Error creating relationship {source_id_value}-[{relationship_type}]->{target_id_value}: {e}",
                exc_info=True,
            )
            raise

    @retry(
        stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=1, max=10), reraise=True
    )
    def get_narrative_ttl_status(self, narrative_id: str) -> dict:
        """
        Conceptual method to check TTL status for a narrative.
        In a real system, this might involve checking a 'created_at' property
        and comparing it to the current time, or querying a separate TTL service.
        """
        query = (
            "MATCH (n:Narrative {id: $narrative_id}) "
            "RETURN n.created_at AS createdAt, n.archived AS archived"
        )
        try:
            with self.driver.session() as session:
                result = session.read_transaction(
                    lambda tx: tx.run(query, narrative_id=narrative_id).single()
                )
                if result:
                    created_at = result["createdAt"]
                    archived = result["archived"]
                    # Simple conceptual check for 180 days (180 * 24 * 3600 seconds)
                    is_expired = (
                        (time.time() - created_at) > (180 * 24 * 3600) if created_at else False
                    )
                    return {
                        "narrative_id": narrative_id,
                        "created_at": created_at,
                        "archived": archived,
                        "is_expired": is_expired,
                    }
                return {"narrative_id": narrative_id, "status": "not_found"}
        except Exception as e:
            logger.info(
                f"Error checking TTL status for narrative {narrative_id}: {e}", exc_info=True
            )
            raise


# Example Usage (for testing this module independently)
if __name__ == "__main__":
    import time

    # --- IMPORTANT: Replace these with your actual Neo4j details ---
    NEO4J_CONFIG = {
        "neo4j_uri": "bolt://localhost:7687",
        "neo4j_username": "neo4j",
        "neo4j_password": "password",
    }

    client = None
    try:
        client = IntelGraphNeo4jClient(NEO4J_CONFIG)

        # 1. Create/Update Entities
        logger.info("\n--- Testing create_or_update_entity ---")
        person_entity = client.create_or_update_entity(
            "Person", {"id": "person_123", "name": "John Doe", "role": "analyst"}
        )
        org_entity = client.create_or_update_entity(
            "Organization", {"id": "org_abc", "name": "Global Corp", "type": "private"}
        )
        meme_entity = client.create_or_update_entity(
            "Meme", {"id": "meme_xyz", "name": "WestCollapse", "topic": "geopolitics"}
        )
        country_entity = client.create_or_update_entity(
            "Country", {"id": "country_us", "name": "United States"}
        )

        # 2. Create Relationships
        logger.info("\n--- Testing create_relationship ---")
        # Person works for Organization
        client.create_relationship(
            "Person",
            "id",
            "person_123",
            "Organization",
            "id",
            "org_abc",
            "WORKS_FOR",
            {"start_date": "2020-01-01"},
        )
        # Meme targets Country
        client.create_relationship(
            "Meme",
            "id",
            "meme_xyz",
            "Country",
            "id",
            "country_us",
            "TARGETS",
            {"confidence": 0.95, "timestamp": time.time()},
        )

        # 3. Test TTL status (conceptual)
        logger.info("\n--- Testing get_narrative_ttl_status (conceptual) ---")
        # First, create a dummy narrative node for testing TTL
        narrative_node = client.create_or_update_entity(
            "Narrative",
            {"id": "test_narrative_1", "text": "Test narrative for TTL", "created_at": time.time()},
        )
        ttl_status = client.get_narrative_ttl_status("test_narrative_1")
        print(f"TTL Status for test_narrative_1: {json.dumps(ttl_status, indent=2)}")

    except Exception as e:
        logger.error(f"Neo4j client test failed: {e}", exc_info=True)
    finally:
        if client:
            client.close()
