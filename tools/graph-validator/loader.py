import os
import random
import time
import logging
from neo4j import GraphDatabase

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("graph-loader")

class GraphLoader:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def clear_database(self):
        logger.info("Clearing database...")
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")

    def create_nodes(self, count=1000):
        logger.info(f"Creating {count} nodes...")
        # Create constraint/index for performance
        try:
            with self.driver.session() as session:
                session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE")
        except Exception as e:
            logger.warning(f"Could not create constraint: {e}")

        query = """
        UNWIND range(1, $count) AS id
        CREATE (:Person {id: id, name: 'Person-' + toString(id)})
        """
        with self.driver.session() as session:
            session.run(query, count=count)

    def create_random_edges(self, node_count=1000, edge_count=2000):
        logger.info(f"Creating {edge_count} random edges...")
        # This is a naive way to create edges, but works for small scale testing.
        # For larger scale, we'd want to batch this.

        # We'll do it in batches of 1000
        batch_size = 1000
        remaining = edge_count

        while remaining > 0:
            current_batch = min(remaining, batch_size)
            edges = []
            for _ in range(current_batch):
                source = random.randint(1, node_count)
                target = random.randint(1, node_count)
                if source != target:
                    edges.append({"source": source, "target": target})

            query = """
            UNWIND $edges AS edge
            MATCH (a:Person {id: edge.source})
            MATCH (b:Person {id: edge.target})
            MERGE (a)-[:KNOWS]->(b)
            """

            with self.driver.session() as session:
                session.run(query, edges=edges)

            remaining -= current_batch
            logger.info(f"Created {edge_count - remaining} edges so far...")

def main():
    uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD", "password")

    node_count = int(os.environ.get("NODE_COUNT", 1000))
    edge_count = int(os.environ.get("EDGE_COUNT", 3000))

    # Wait for Neo4j to be ready
    logger.info("Waiting for Neo4j...")
    loader = None
    for i in range(30):
        try:
            loader = GraphLoader(uri, user, password)
            loader.driver.verify_connectivity()
            logger.info("Connected to Neo4j.")
            break
        except Exception as e:
            logger.warning(f"Connection failed, retrying in 2s... ({e})")
            time.sleep(2)

    if not loader:
        logger.error("Could not connect to Neo4j.")
        exit(1)

    try:
        loader.clear_database()
        loader.create_nodes(node_count)
        loader.create_random_edges(node_count, edge_count)
        logger.info("Graph loading complete.")
    finally:
        loader.close()

if __name__ == "__main__":
    main()
