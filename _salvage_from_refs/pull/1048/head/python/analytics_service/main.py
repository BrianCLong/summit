@app.post("/analyze/gnn-node-classification")
async def run_gnn_node_classification():
    """
    Triggers GNN-based node classification on the entire graph.
    Fetches data from Neo4j, prepares it for PyG, runs inference,
    and writes predicted classes back to Neo4j.
    """
    logger.info("Received request for GNN node classification.")
    if not neo4j_connector or not neo4j_connector._driver:
        raise HTTPException(status_code=503, detail="Neo4j connection not established.")

    gnn_inference_start_time = time.time()
    try:
        # 1. Fetch graph data from Neo4j
        graph_data = await neo4j_connector.fetch_graph_data()
        nodes = graph_data["nodes"]
        relationships = graph_data["relationships"]
        logger.info(f"Fetched {len(nodes)} nodes and {len(relationships)} relationships for GNN.")

        if not nodes:
            logger.warning("No nodes found for GNN classification.")
            return {"message": "No nodes found, skipping GNN classification.", "nodes_classified": 0}

        # 2. Prepare data for PyTorch Geometric
        pyg_data, node_id_to_idx = create_pyg_data(nodes, relationships)
        logger.info(f"Prepared PyG Data object with {pyg_data.num_nodes} nodes and {pyg_data.num_edges} edges.")

        # 3. Load GNN model and perform inference
        # NOTE: For a real application, the model would be trained offline and loaded here.
        # num_node_features should match the 'x' dimension from create_pyg_data
        # num_classes depends on your classification task (e.g., 2 for binary, N for multi-class)
        num_node_features = pyg_data.x.shape[1]
        num_classes = 2 # Example: Assuming a binary classification task
        
        # Load a dummy/untrained model for demonstration
        model = load_simple_gcn_model(num_node_features, num_classes)
        model.eval() # Set to evaluation mode

        with torch.no_grad():
            out = model(pyg_data)
            predicted_classes = out.argmax(dim=1) # Get the class with the highest probability
        
        logger.info("GNN inference completed.")

        # 4. Write predicted classes back to Neo4j nodes
        update_tasks = []
        idx_to_node_id = {v: k for k, v in node_id_to_idx.items()}
        for i, predicted_class in enumerate(predicted_classes):
            original_node_id = idx_to_node_id.get(i)
            if original_node_id:
                update_tasks.append(neo4j_connector.update_node_properties(original_node_id, {"gnn_predicted_class": predicted_class.item()}))
        
        await asyncio.gather(*update_tasks)
        logger.info(f"Updated {len(update_tasks)} nodes with GNN predicted classes in Neo4j.")

        GNN_INFERENCE_RUNS.inc()
        GNN_INFERENCE_DURATION.observe(time.time() - gnn_inference_start_time)

        return {
            "message": "GNN node classification completed successfully.",
            "nodes_classified": len(update_tasks)
        }
    except Exception as e:
        logger.error(f"Error during GNN node classification: {e}", exc_info=True)
        GNN_INFERENCE_DURATION.observe(time.time() - gnn_inference_start_time) # Still record duration on error
        raise HTTPException(status_code=500, detail=f"Internal server error during GNN node classification: {e}")