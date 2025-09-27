import json
import os
import time

from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable

print("Graph service starting up...")

KAFKA_BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
NLP_POSTS_TOPIC = "nlp.posts"  # Still consume from here for now, but will change to threat.clusters
THREAT_CLUSTERS_TOPIC = "threat.clusters"  # New topic for clustered data
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "password")


class Neo4jClient:
    def __init__(self, uri, user, password):
        self._driver = None
        self._uri = uri
        self._user = user
        self._password = password
        self._connect_with_retry()

    def _connect_with_retry(self, max_attempts=10, delay=5):
        for attempt in range(max_attempts):
            try:
                print(f"Attempting to connect to Neo4j (Attempt {attempt + 1}/{max_attempts})...")
                self._driver = GraphDatabase.driver(self._uri, auth=(self._user, self._password))
                self._driver.verify_connectivity()
                print("Successfully connected to Neo4j.")
                return
            except ServiceUnavailable as e:
                print(f"Neo4j connection failed: {e}. Retrying in {delay} seconds...")
                time.sleep(delay)
            except Exception as e:
                print(f"An unexpected error occurred during Neo4j connection: {e}")
                time.sleep(delay)
        raise Exception("Failed to connect to Neo4j after multiple attempts.")

    def close(self):
        if self._driver:
            self._driver.close()

    def add_post(self, post):
        with self._driver.session() as session:
            session.write_transaction(self._create_post_and_entities, post)

    def add_cluster_info(self, cluster_info):
        with self._driver.session() as session:
            session.write_transaction(self._create_cluster_and_link_post, cluster_info)

    @staticmethod
    def _create_post_and_entities(tx, post):
        # Create Post node
        query = (
            "MERGE (p:Post {id: $id}) "
            "ON CREATE SET p.text = $text, p.platform = $platform, p.timestamp = $timestamp "
            "RETURN p"
        )
        tx.run(
            query,
            id=post["id"],
            text=post["text"],
            platform=post["platform"],
            timestamp=post["timestamp"],
        )

        # Create User node and link to Post
        user = post.get("metadata", {}).get("user", "unknown")
        tx.run("MERGE (u:User {name: $user})", user=user)
        tx.run(
            "MATCH (u:User {name: $user}), (p:Post {id: $id}) MERGE (u)-[:AUTHORED]->(p)",
            user=user,
            id=post["id"],
        )

        # Create Entity nodes and link to Post
        for entity in post.get("nlp", {}).get("entities", []):
            tx.run(
                "MERGE (e:Entity {text: $text, type: $label})",
                text=entity["text"],
                label=entity["label"],
            )
            tx.run(
                "MATCH (p:Post {id: $id}), (e:Entity {text: $text, type: $label}) MERGE (p)-[:CONTAINS]->(e)",
                id=post["id"],
                text=entity["text"],
                label=entity["label"],
            )

    @staticmethod
    def _create_cluster_and_link_post(tx, cluster_info):
        cluster_id = cluster_info["cluster_id"]
        post_id = cluster_info["post_id"]
        timestamp = cluster_info["timestamp"]
        text_sample = cluster_info["text_sample"]

        # Create or merge Cluster node
        tx.run(
            "MERGE (c:Cluster {id: $cluster_id}) "
            "ON CREATE SET c.created_at = $timestamp, c.sample_text = $text_sample",
            cluster_id=cluster_id,
            timestamp=timestamp,
            text_sample=text_sample,
        )

        # Link Post to Cluster
        tx.run(
            "MATCH (p:Post {id: $post_id}), (c:Cluster {id: $cluster_id}) "
            "MERGE (p)-[:BELONGS_TO]->(c)",
            post_id=post_id,
            cluster_id=cluster_id,
        )


def main():
    print("Starting graph service main function...")
    neo4j_client = Neo4jClient(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)

    consumer = None
    max_attempts = 10
    delay = 5

    for attempt in range(max_attempts):
        try:
            print(
                f"Attempting to connect consumer to Kafka (Attempt {attempt + 1}/{max_attempts})..."
            )
            # Consume from THREAT_CLUSTERS_TOPIC instead of NLP_POSTS_TOPIC
            consumer = KafkaConsumer(
                THREAT_CLUSTERS_TOPIC,
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS.split(","),
                auto_offset_reset="earliest",
                group_id="graph-builder",
                value_deserializer=lambda x: json.loads(x.decode("utf-8")),
            )
            consumer.poll(timeout_ms=1000)  # Test connection
            print("Successfully connected consumer to Kafka.")
            break
        except NoBrokersAvailable as e:
            print(f"Kafka consumer connection failed: {e}. Retrying in {delay} seconds...")
            time.sleep(delay)
        except Exception as e:
            print(f"An unexpected error occurred during Kafka consumer connection: {e}")
            time.sleep(delay)
    else:
        raise Exception("Failed to connect consumer to Kafka after multiple attempts.")

    print("Graph service consumer starting...")
    for message in consumer:
        cluster_info = message.value
        print(
            f"Adding cluster info to graph for post: {cluster_info['post_id']} in cluster {cluster_info['cluster_id']}"
        )
        neo4j_client.add_cluster_info(cluster_info)

    neo4j_client.close()


if __name__ == "__main__":
    main()
