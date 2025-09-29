import os
import time
from dotenv import load_dotenv
from loguru import logger
from rq import Connection, Worker
import torch

# Import analytics functions and database connector
from analytics.community import detect_communities_louvain
from analytics.gnn_data_prep import create_pyg_data
from analytics.gnn_models.simple_gcn import load_simple_gcn_model
from database.connector import Neo4jConnector

# Load environment variables
load_dotenv()

# Initialize Neo4j Connector (outside of job function for potential reuse, or pass config)
# For RQ, it's often better to initialize resources within the job function
# or pass necessary config to avoid serialization issues.
# Here, we'll re-initialize for each job for simplicity and robustness.

def get_neo4j_connector():
    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_username = os.getenv("NEO4J_USERNAME", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "password")
    return Neo4jConnector(neo4j_uri, neo4j_username, neo4j_password)

async def perform_community_detection_job():
    logger.info("Starting community detection job...")
    connector = get_neo4j_connector()
    try:
        await connector.connect()
        graph_data = await connector.fetch_graph_data()
        nodes = graph_data["nodes"]
        relationships = graph_data["relationships"]
        logger.info(f"Fetched {len(nodes)} nodes and {len(relationships)} relationships for community detection.")

        if not nodes:
            logger.warning("No nodes found for community detection. Job finished.")
            return {"message": "No nodes found", "communities_detected": 0, "nodes_updated": 0}

        communities = detect_communities_louvain(nodes, relationships)
        logger.info(f"Detected {len(communities)} communities.")

        update_tasks = []
        for community_id, node_ids in communities.items():
            for node_id in node_ids:
                update_tasks.append(connector.update_node_properties(node_id, {"community_id": community_id}))
        await asyncio.gather(*update_tasks)
        logger.info(f"Updated {len(update_tasks)} nodes with community IDs.")

        return {
            "message": "Community detection completed successfully.",
            "communities_detected": len(communities),
            "nodes_updated": len(update_tasks)
        }
    except Exception as e:
        logger.error(f"Error in community detection job: {e}", exc_info=True)
        raise # Re-raise to mark job as failed
    finally:
        await connector.close()

async def perform_gnn_node_classification_job():
    logger.info("Starting GNN node classification job...")
    connector = get_neo4j_connector()
    try:
        await connector.connect()
        graph_data = await connector.fetch_graph_data()
        nodes = graph_data["nodes"]
        relationships = graph_data["relationships"]
        logger.info(f"Fetched {len(nodes)} nodes and {len(relationships)} relationships for GNN.")

        if not nodes:
            logger.warning("No nodes found for GNN classification. Job finished.")
            return {"message": "No nodes found", "nodes_classified": 0}

        pyg_data, node_id_to_idx = create_pyg_data(nodes, relationships)
        logger.info(f"Prepared PyG Data object with {pyg_data.num_nodes} nodes and {pyg_data.num_edges} edges.")

        num_node_features = pyg_data.x.shape[1]
        num_classes = 2 # Example: Assuming a binary classification task
        model = load_simple_gcn_model(num_node_features, num_classes)
        model.eval()

        with torch.no_grad():
            out = model(pyg_data)
            predicted_classes = out.argmax(dim=1)
        
        logger.info("GNN inference completed.")

        update_tasks = []
        idx_to_node_id = {v: k for k, v in node_id_to_idx.items()}
        for i, predicted_class in enumerate(predicted_classes):
            original_node_id = idx_to_node_id.get(i)
            if original_node_id:
                update_tasks.append(connector.update_node_properties(original_node_id, {"gnn_predicted_class": predicted_class.item()}))
        await asyncio.gather(*update_tasks)
        logger.info(f"Updated {len(update_tasks)} nodes with GNN predicted classes.")

        return {
            "message": "GNN node classification completed successfully.",
            "nodes_classified": len(update_tasks)
        }
    except Exception as e:
        logger.error(f"Error in GNN node classification job: {e}", exc_info=True)
        raise # Re-raise to mark job as failed
    finally:
        await connector.close()


if __name__ == '__main__':
    # Configure logging for the worker
    logger.add("worker.log", rotation="10 MB")
    logger.info("RQ Worker starting...")
    
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", 6379))
    redis_db = int(os.getenv("REDIS_DB", 0))

    with Connection(redis.Redis(host=redis_host, port=redis_port, db=redis_db)):
        worker = Worker(['default'])
        worker.work()
