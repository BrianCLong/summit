def run_inference(ingested_data, he_interface, model_params=None):
    """
    Run GNN inference on ingested encrypted data.
    """
    topology = ingested_data["topology"]
    features = ingested_data["features"]

    # In a real GNN, topology would be converted to an adjacency matrix
    # and features to a tensor of ciphertexts.

    cipher_score = he_interface.eval_model(topology, features, model_params)

    return cipher_score
