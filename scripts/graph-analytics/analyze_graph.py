import json
import csv
import random
import time
from typing import List, Dict, Any
from datetime import datetime, timedelta

import networkx as nx
import pandas as pd
from community import community_louvain

# Import Summit models if available, otherwise define mocks for standalone execution
try:
    import sys
    import os
    # Add project root to python path to import summit
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
    from summit.graph.model import Node, Edge, NodeType, EdgeType, Platform
except ImportError:
    # Standalone mode fallback
    print("Warning: Could not import summit.graph.model. Using standalone types.")
    NodeType = str
    EdgeType = str
    Platform = str

    class Node:
        def __init__(self, id: str, type: NodeType, platform: Platform, attrs: dict):
            self.id = id
            self.type = type
            self.platform = platform
            self.attrs = attrs

    class Edge:
        def __init__(self, src: str, dst: str, type: EdgeType, ts: int, weight: float = 1.0, attrs: dict = None):
            self.src = src
            self.dst = dst
            self.type = type
            self.ts = ts
            self.weight = weight
            self.attrs = attrs or {}

def generate_mock_graph(num_nodes: int = 100, num_edges: int = 300) -> nx.DiGraph:
    """Generates a mock knowledge graph for analytics testing."""
    G = nx.DiGraph()

    node_types: List[NodeType] = ["actor", "content", "url", "media", "topic"]
    platforms: List[Platform] = ["x", "facebook", "telegram", "other"]
    edge_types: List[EdgeType] = ["engages", "mentions", "amplifies", "co_shares", "crossposts"]

    nodes = []
    for i in range(num_nodes):
        node_id = f"node_{i}"
        n_type = random.choice(node_types)
        platform = random.choice(platforms)
        node = Node(id=node_id, type=n_type, platform=platform, attrs={"name": f"Entity {i}"})
        nodes.append(node)
        G.add_node(node.id, type=node.type, platform=node.platform, **node.attrs)

    now = int(time.time())
    start_time = now - (30 * 24 * 60 * 60) # 30 days ago

    for _ in range(num_edges):
        src = random.choice(nodes)
        dst = random.choice(nodes)
        if src.id != dst.id:
            e_type = random.choice(edge_types)
            # Generate a timestamp within the last 30 days
            ts = random.randint(start_time, now)
            edge = Edge(src=src.id, dst=dst.id, type=e_type, ts=ts, weight=round(random.uniform(0.5, 2.0), 2))
            G.add_edge(edge.src, edge.dst, type=edge.type, ts=edge.ts, weight=edge.weight)

    return G


def analyze_size_metrics(G: nx.DiGraph) -> Dict[str, Any]:
    """Computes basic graph size metrics."""
    num_nodes = G.number_of_nodes()
    num_edges = G.number_of_edges()

    # In a directed graph, average degree is in-degree + out-degree / nodes = edges / nodes * 2
    avg_degree = sum(dict(G.degree()).values()) / num_nodes if num_nodes > 0 else 0

    return {
        "node_count": num_nodes,
        "edge_count": num_edges,
        "average_degree": round(avg_degree, 2)
    }

def analyze_growth_trend(G: nx.DiGraph) -> List[Dict[str, Any]]:
    """Analyzes the growth trend of the graph over time."""
    edges_data = [(u, v, d) for u, v, d in G.edges(data=True) if 'ts' in d]

    if not edges_data:
        return []

    df = pd.DataFrame([
        {'timestamp': pd.to_datetime(d['ts'], unit='s'), 'weight': d.get('weight', 1.0)}
        for _, _, d in edges_data
    ])

    # Group by date to see daily growth
    df['date'] = df['timestamp'].dt.date
    daily_growth = df.groupby('date').size().reset_index(name='edge_count')
    daily_growth['cumulative_edges'] = daily_growth['edge_count'].cumsum()

    # Convert to standard python dicts for JSON serialization
    trend = []
    for _, row in daily_growth.iterrows():
        trend.append({
            "date": str(row['date']),
            "new_edges": int(row['edge_count']),
            "cumulative_edges": int(row['cumulative_edges'])
        })

    return trend

def analyze_centrality(G: nx.DiGraph) -> pd.DataFrame:
    """Computes PageRank and Betweenness Centrality."""
    pagerank = nx.pagerank(G, alpha=0.85, weight='weight')
    betweenness = nx.betweenness_centrality(G, weight='weight')

    data = []
    for node in G.nodes():
        node_data = G.nodes[node]
        data.append({
            "entity_id": node,
            "type": node_data.get("type", "unknown"),
            "pagerank": round(pagerank.get(node, 0), 6),
            "betweenness": round(betweenness.get(node, 0), 6)
        })

    df = pd.DataFrame(data)
    # Sort by pagerank descending
    df = df.sort_values(by="pagerank", ascending=False).reset_index(drop=True)
    return df

def analyze_connectivity(G: nx.DiGraph) -> Dict[str, Any]:
    """Analyzes graph connectivity (connected components)."""
    strongly_connected = list(nx.strongly_connected_components(G))
    weakly_connected = list(nx.weakly_connected_components(G))

    return {
        "num_strongly_connected_components": len(strongly_connected),
        "largest_scc_size": max(len(c) for c in strongly_connected) if strongly_connected else 0,
        "num_weakly_connected_components": len(weakly_connected),
        "largest_wcc_size": max(len(c) for c in weakly_connected) if weakly_connected else 0
    }

def detect_communities(G: nx.DiGraph) -> Dict[str, Any]:
    """Detects entity clusters using the Louvain community detection algorithm."""
    # Louvain works on undirected graphs
    H = G.to_undirected()
    try:
        partition = community_louvain.best_partition(H, weight='weight')

        # Group nodes by community
        communities = {}
        for node, comm_id in partition.items():
            if comm_id not in communities:
                communities[comm_id] = []
            communities[comm_id].append(node)

        return {
            "num_communities": len(communities),
            "modularity": round(community_louvain.modularity(partition, H, weight='weight'), 4),
            "clusters": {
                str(comm_id): {
                    "size": len(nodes),
                    "members": nodes[:10]  # First 10 members as sample
                } for comm_id, nodes in communities.items()
            }
        }
    except Exception as e:
        print(f"Warning: Community detection failed - {e}")
        return {"num_communities": 0, "modularity": 0.0, "clusters": {}}

def analyze_co_occurrence(G: nx.DiGraph) -> pd.DataFrame:
    """Generates an entity co-occurrence frequency matrix based on edge presence."""
    nodes = list(G.nodes())
    matrix = pd.DataFrame(0.0, index=nodes, columns=nodes)

    # Co-occurrence defined simply: if A connects to B, A and B co-occur.
    for src, dst, data in G.edges(data=True):
        weight = data.get('weight', 1.0)
        matrix.at[src, dst] += weight
        matrix.at[dst, src] += weight  # Symmetric co-occurrence

    return matrix

def main():
    print("Generating mock knowledge graph...")
    G = generate_mock_graph()

    print("Computing size metrics...")
    size_metrics = analyze_size_metrics(G)

    print("Analyzing connectivity...")
    connectivity = analyze_connectivity(G)

    print("Analyzing growth trend...")
    growth_trend = analyze_growth_trend(G)

    print("Detecting communities...")
    communities = detect_communities(G)

    print("Computing centrality rankings...")
    centrality_df = analyze_centrality(G)

    print("Computing co-occurrence matrix...")
    co_occurrence_matrix = analyze_co_occurrence(G)

    # Structure the full analytics report
    report = {
        "timestamp": datetime.now().isoformat(),
        "graph_size": size_metrics,
        "connectivity": connectivity,
        "community_detection_summary": {
            "num_communities": communities.get("num_communities", 0),
            "modularity": communities.get("modularity", 0.0)
        },
        "growth_trend": growth_trend
    }

    # Export outputs
    output_dir = os.path.dirname(os.path.abspath(__file__))

    print("Writing reports...")

    # JSON Analytics Report
    report_path = os.path.join(output_dir, "analytics_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f" - Exported JSON report to: {report_path}")

    # JSON Community Results
    community_path = os.path.join(output_dir, "community_results.json")
    with open(community_path, "w") as f:
        json.dump(communities, f, indent=2)
    print(f" - Exported Community results to: {community_path}")

    # CSV Centrality Ranking
    centrality_path = os.path.join(output_dir, "centrality_ranking.csv")
    centrality_df.to_csv(centrality_path, index=False)
    print(f" - Exported Centrality ranking to: {centrality_path}")

    # CSV Co-occurrence Matrix
    co_occurrence_path = os.path.join(output_dir, "co_occurrence_matrix.csv")
    co_occurrence_matrix.to_csv(co_occurrence_path)
    print(f" - Exported Co-occurrence matrix to: {co_occurrence_path}")

    print("\nGraph Analytics Completed Successfully.")

if __name__ == "__main__":
    main()
