from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import PlainTextResponse
from loguru import logger
from contextlib import asynccontextmanager
import time
import os
from dotenv import load_dotenv

from analytics.community import detect_communities_louvain
from database.connector import Neo4jConnector
from monitoring.metrics import (
    REQUEST_COUNT,
    REQUEST_LATENCY,
    COMMUNITY_DETECTION_RUNS,
    COMMUNITY_DETECTION_DURATION,
    get_metrics_data
)

# Load environment variables from .env file
load_dotenv()

# --- Application Lifecycle Management ---
neo4j_connector: Optional[Neo4jConnector] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global neo4j_connector
    logger.info("Starting up analytics service...")
    
    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_username = os.getenv("NEO4J_USERNAME", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "password")

    neo4j_connector = Neo4jConnector(neo4j_uri, neo4j_username, neo4j_password)
    try:
        await neo4j_connector.connect()
        logger.info("Successfully connected to Neo4j.")
    except Exception as e:
        logger.error(f"Failed to connect to Neo4j: {e}")
        # Depending on criticality, you might want to exit or raise here
        # For now, we'll let the app start but operations will fail.

    yield

    logger.info("Shutting down analytics service...")
    if neo4j_connector:
        await neo4j_connector.close()
        logger.info("Disconnected from Neo4j.")


app = FastAPI(title="IntelGraph Analytics Service", version="1.0.0", lifespan=lifespan)

# --- Middleware for Metrics ---
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    endpoint = request.url.path
    method = request.method
    
    REQUEST_COUNT.labels(endpoint=endpoint, method=method).inc()
    REQUEST_LATENCY.labels(endpoint=endpoint, method=method).observe(process_time)
    
    response.headers["X-Process-Time"] = str(process_time)
    return response

# --- Routes ---
@app.get("/health", response_class=PlainTextResponse)
async def health_check():
    """Health check endpoint."""
    return "OK"

@app.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    """Prometheus metrics endpoint."""
    return get_metrics_data()

@app.post("/analyze/community-detection")
async def run_community_detection():
    """
    Triggers community detection using the Louvain method on the entire graph
    and writes the detected community IDs back to Neo4j nodes.
    """
    logger.info("Received request for community detection.")
    if not neo4j_connector or not neo4j_connector._driver:
        raise HTTPException(status_code=503, detail="Neo4j connection not established.")

    start_time = time.time()
    try:
        # 1. Fetch graph data from Neo4j
        graph_data = await neo4j_connector.fetch_graph_data()
        nodes = graph_data["nodes"]
        relationships = graph_data["relationships"]
        logger.info(f"Fetched {len(nodes)} nodes and {len(relationships)} relationships from Neo4j.")

        if not nodes:
            logger.warning("No nodes found in Neo4j for community detection.")
            return {"message": "No nodes found, skipping community detection.", "communities_detected": 0}

        # 2. Run community detection
        communities = detect_communities_louvain(nodes, relationships)
        logger.info(f"Detected {len(communities)} communities.")

        # 3. Write community IDs back to Neo4j nodes
        update_tasks = []
        for community_id, node_ids in communities.items():
            for node_id in node_ids:
                # Ensure node_id is the elementId for update_node_properties
                # We need to map back from the 'id' used in networkx (which is elementId from fetch_graph_data)
                update_tasks.append(neo4j_connector.update_node_properties(node_id, {"community_id": community_id}))
        
        await asyncio.gather(*update_tasks)
        logger.info(f"Updated {len(update_tasks)} nodes with community IDs in Neo4j.")

        COMMUNITY_DETECTION_RUNS.inc()
        COMMUNITY_DETECTION_DURATION.observe(time.time() - start_time)

        return {
            "message": "Community detection completed successfully.",
            "communities_detected": len(communities),
            "nodes_updated": len(update_tasks)
        }
    except Exception as e:
        logger.error(f"Error during community detection: {e}", exc_info=True)
        COMMUNITY_DETECTION_DURATION.observe(time.time() - start_time) # Still record duration on error
        raise HTTPException(status_code=500, detail=f"Internal server error during community detection: {e}")

