import os
import time
from fastapi import FastAPI
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable
import redis
from redis.exceptions import ConnectionError

app = FastAPI()

NEO4J_URI = os.environ.get('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.environ.get('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.environ.get('NEO4J_PASSWORD', 'password')
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')

neo4j_driver = None
redis_client = None
max_attempts = 10
delay = 5

# Initialize Neo4j Driver with retry
for attempt in range(max_attempts):
    try:
        print(f"API service: Attempting to connect to Neo4j (Attempt {attempt + 1}/{max_attempts})...")
        neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        neo4j_driver.verify_connectivity()
        print("API service: Successfully connected to Neo4j.")
        break
    except ServiceUnavailable as e:
        print(f"API service: Neo4j connection failed: {e}. Retrying in {delay} seconds...")
        time.sleep(delay)
    except Exception as e:
        print(f"API service: An unexpected error occurred during Neo4j connection: {e}")
        time.sleep(delay)
else:
    raise Exception("API service: Failed to connect to Neo4j after multiple attempts.")

# Initialize Redis Client with retry
for attempt in range(max_attempts):
    try:
        print(f"API service: Attempting to connect to Redis (Attempt {attempt + 1}/{max_attempts})...")
        redis_client = redis.from_url(REDIS_URL)
        redis_client.ping()
        print("API service: Successfully connected to Redis.")
        break
    except ConnectionError as e:
        print(f"API service: Redis connection failed: {e}. Retrying in {delay} seconds...")
        time.sleep(delay)
    except Exception as e:
        print(f"API service: An unexpected error occurred during Redis connection: {e}")
        time.sleep(delay)
else:
    raise Exception("API service: Failed to connect to Redis after multiple attempts.")

@app.on_event("shutdown")
def shutdown_event():
    if neo4j_driver:
        neo4j_driver.close()

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/graph")
def get_graph_data():
    """Fetches a subgraph for visualization."""
    query = (
        "MATCH (n)-[r]->(m) "
        "RETURN n, r, m LIMIT 100"
    )
    with neo4j_driver.session() as session:
        result = session.run(query)
        nodes = []
        edges = []
        node_ids = set()

        for record in result:
            source_node = record['n']
            relationship = record['r']
            target_node = record['m']

            if source_node.id not in node_ids:
                nodes.append({
                    "id": source_node.id,
                    "label": list(source_node.labels)[0],
                    "properties": dict(source_node)
                })
                node_ids.add(source_node.id)

            if target_node.id not in node_ids:
                nodes.append({
                    "id": target_node.id,
                    "label": list(target_node.labels)[0],
                    "properties": dict(target_node)
                })
                node_ids.add(target_node.id)

            edges.append({
                "id": relationship.id,
                "source": relationship.start_node.id,
                "target": relationship.end_node.id,
                "type": relationship.type,
                "properties": dict(relationship)
            })

    return {"nodes": nodes, "edges": edges}