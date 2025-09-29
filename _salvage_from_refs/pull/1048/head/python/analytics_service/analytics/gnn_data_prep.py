import torch
from torch_geometric.data import Data
from typing import List, Dict, Any, Tuple
import numpy as np

def create_pyg_data(nodes: List[Dict[str, Any]], relationships: List[Dict[str, Any]]) -> Tuple[Data, Dict[str, int]]:
    """
    Converts a list of nodes and relationships into a PyTorch Geometric Data object.
    
    Args:
        nodes: A list of dictionaries, where each dictionary represents a node
               and must contain an 'id' key and optionally 'properties'.
        relationships: A list of dictionaries, where each dictionary represents
                       a relationship and must contain 'source_id' and 'target_id' keys.
                       
    Returns:
        A tuple containing:
        - Data: A PyTorch Geometric Data object.
        - Dict[str, int]: A mapping from original node ID to integer index.
    """
    if not nodes:
        return Data(x=torch.empty(0, 0), edge_index=torch.empty(2, 0, dtype=torch.long)), {}

    # Create a mapping from original node ID to integer index
    node_id_to_idx = {node['id']: i for i, node in enumerate(nodes)}

    # Node features (x)
    # For simplicity, let's try to extract numerical features from properties.
    # If no numerical properties, we can use a simple one-hot encoding of node labels or a constant vector.
    # This is a basic example; real-world feature engineering is more complex.
    
    # Collect all possible property keys to ensure consistent feature vector length
    all_property_keys = set()
    for node in nodes:
        if 'properties' in node and isinstance(node['properties'], list):
            for prop in node['properties']:
                if 'key' in prop:
                    all_property_keys.add(prop['key'])
    
    # Filter for numerical properties for now
    numerical_property_keys = sorted([k for k in all_property_keys if any(isinstance(node.get('properties', []), list) and any(p.get('key') == k and isinstance(p.get('value'), (int, float)) for p in node.get('properties')) for node in nodes)])

    if numerical_property_keys:
        x = []
        for node in nodes:
            features = []
            node_props = {p['key']: p['value'] for p in node.get('properties', []) if 'key' in p and 'value' in p}
            for key in numerical_property_keys:
                val = node_props.get(key, 0) # Default to 0 if property not present or not numerical
                features.append(val if isinstance(val, (int, float)) else 0)
            x.append(features)
        x = torch.tensor(x, dtype=torch.float)
    else:
        # Fallback: If no numerical features, use a simple constant feature vector (e.g., all ones)
        # Or, one-hot encode node types if available
        logger.warning("No numerical node properties found for GNN features. Using a constant feature vector.")
        x = torch.ones(len(nodes), 1, dtype=torch.float) # Each node has a single feature of 1.0

    # Edge index (edge_index)
    edge_index = []
    for rel in relationships:
        src_id = rel['source_id']
        tgt_id = rel['target_id']
        if src_id in node_id_to_idx and tgt_id in node_id_to_idx:
            edge_index.append([node_id_to_idx[src_id], node_id_to_idx[tgt_id]])
    
    if edge_index:
        edge_index = torch.tensor(edge_index, dtype=torch.long).t().contiguous()
    else:
        edge_index = torch.empty(2, 0, dtype=torch.long)

    data = Data(x=x, edge_index=edge_index)
    return data, node_id_to_idx

if __name__ == '__main__':
    # Example Usage
    from loguru import logger # Import logger for example
    
    sample_nodes = [
        {"id": "A", "properties": [{"key": "age", "value": 30}, {"key": "type", "value": "person"}]},
        {"id": "B", "properties": [{"key": "age", "value": 25}, {"key": "type", "value": "person"}]},
        {"id": "C", "properties": [{"key": "age", "value": 35}, {"key": "type", "value": "person"}]},
        {"id": "D", "properties": [{"key": "value", "value": 100}, {"key": "type", "value": "company"}]},
    ]
    sample_relationships = [
        {"source_id": "A", "target_id": "B", "type": "FRIENDS_WITH"},
        {"source_id": "B", "target_id": "C", "type": "KNOWS"},
        {"source_id": "C", "target_id": "A", "type": "WORKS_WITH"},
        {"source_id": "A", "target_id": "D", "type": "EMPLOYED_BY"},
    ]

    pyg_data, node_map = create_pyg_data(sample_nodes, sample_relationships)
    print("PyG Data Object:", pyg_data)
    print("Node ID to Index Map:", node_map)

    # Example with no numerical features
    sample_nodes_no_num = [
        {"id": "X", "properties": [{"key": "name", "value": "Alice"}]},
        {"id": "Y", "properties": [{"key": "name", "value": "Bob"}]}
    ]
    sample_relationships_no_num = [
        {"source_id": "X", "target_id": "Y", "type": "CONNECTS"},
    ]
    pyg_data_no_num, node_map_no_num = create_pyg_data(sample_nodes_no_num, sample_relationships_no_num)
    print("\nPyG Data Object (no numerical features):", pyg_data_no_num)
    print("Node ID to Index Map (no numerical features):", node_map_no_num)
