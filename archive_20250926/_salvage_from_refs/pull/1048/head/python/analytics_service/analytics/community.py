import networkx as nx
from typing import List, Dict, Any

def detect_communities_louvain(nodes: List[Dict[str, Any]], relationships: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    """
    Detects communities in a graph using the Louvain method.

    Args:
        nodes: A list of dictionaries, where each dictionary represents a node
               and must contain an 'id' key.
        relationships: A list of dictionaries, where each dictionary represents
                       a relationship and must contain 'source_id' and 'target_id' keys.

    Returns:
        A dictionary where keys are community IDs (integers converted to strings)
        and values are lists of node IDs belonging to that community.
    """
    G = nx.Graph()

    # Add nodes
    for node in nodes:
        G.add_node(node['id'], **{k: v for k, v in node.items() if k != 'id'})

    # Add relationships
    for rel in relationships:
        G.add_edge(rel['source_id'], rel['target_id'], **{k: v for k, v in rel.items() if k not in ['source_id', 'target_id']})

    # Detect communities
    partition = nx.community.louvain_communities(G, seed=42) # Using a fixed seed for reproducibility

    communities = {}
    for i, community_nodes in enumerate(partition):
        communities[str(i)] = list(community_nodes)

    return communities

if __name__ == '__main__':
    # Example Usage
    sample_nodes = [
        {"id": "A", "type": "Person"},
        {"id": "B", "type": "Person"},
        {"id": "C", "type": "Person"},
        {"id": "D", "type": "Person"},
        {"id": "E", "type": "Person"},
    ]
    sample_relationships = [
        {"source_id": "A", "target_id": "B", "type": "FRIENDS_WITH"},
        {"source_id": "B", "target_id": "C", "type": "FRIENDS_WITH"},
        {"source_id": "C", "target_id": "A", "type": "FRIENDS_WITH"},
        {"source_id": "D", "target_id": "E", "type": "FRIENDS_WITH"},
        {"source_id": "A", "target_id": "D", "type": "KNOWS"}, # Weak link between communities
    ]

    detected_communities = detect_communities_louvain(sample_nodes, sample_relationships)
    print("Detected Communities:", detected_communities)
