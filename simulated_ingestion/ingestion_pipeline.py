# simulated_ingestion/ingestion_pipeline.py

import os
import sys
import importlib.util
from pathlib import Path
from typing import Dict, Any, List, Optional
import json # Added for json.dumps in MockGraphDBClient

# Import Graph and find_shortest_path from intelgraph.graph_analytics.core_analytics
# Ensure intelgraph is in sys.path for this import
# (It should be if project root is added to sys.path)
from intelgraph.graph_analytics.core_analytics import Graph, find_shortest_path
from simulated_ingestion.indexing import (
    GraphMetadataIndexer,
    export_graph_metadata_snapshot,
)

class MockGraphDBClient:
    """
    A mock in-memory graph database client for simulation.
    It also builds a simple graph representation for analytics.
    """
    def __init__(self):
        self.nodes = []
        self.relationships = []
        self.graph_representation = Graph() # For analytics

    def create_node(self, node_data: Dict[str, Any]):
        # Ensure node_data has 'id' and 'type' for graph representation
        node_id = node_data.get('properties', {}).get('id') or node_data.get('id')
        if node_id:
            self.nodes.append(node_data)
            attributes = {
                "type": node_data.get('type'),
                **node_data.get('properties', {}),
            }
            self.graph_representation.add_node(node_id, attributes=attributes)
            print(f"Mock DB: Created node {node_data.get('type')}: {node_data.get('properties', {}).get('name')}")
        else:
            print(f"Mock DB: Warning - Node data missing ID: {node_data}")

    def create_relationship(self, rel_data: Dict[str, Any]):
        # Ensure rel_data has source_id, target_id, and type for graph representation
        source_id = rel_data.get('source_id')
        target_id = rel_data.get('target_id')
        if source_id and target_id:
            self.relationships.append(rel_data)
            edge_attributes = {
                key: value
                for key, value in rel_data.items()
                if key not in {'source_id', 'target_id'}
            }
            self.graph_representation.add_edge(source_id, target_id, attributes=edge_attributes)
            print(f"Mock DB: Created relationship {rel_data.get('type')}")
        else:
            print(f"Mock DB: Warning - Relationship data missing source/target ID: {rel_data}")

    def get_all_nodes(self) -> List[Dict[str, Any]]:
        return self.nodes

    def get_all_relationships(self) -> List[Dict[str, Any]]:
        return self.relationships

    def get_graph_representation(self) -> Graph:
        return self.graph_representation

    def clear_db(self):
        self.nodes = []
        self.relationships = []
        self.graph_representation = Graph()

def run_ingestion_pipeline(
    connector_path: str,
    mock_db_client: MockGraphDBClient,
    *,
    indexer: Optional[GraphMetadataIndexer] = None,
    snapshot_path: Optional[Path] = None,
) -> bool:
    """
    Simulates an ingestion pipeline run for a given connector.
    Reads manifest, loads schema mapping, processes sample data, and sends to mock DB.
    After ingestion, it triggers a basic graph analytics function.
    """
    print(f"\n--- Running Ingestion Pipeline for: {connector_path} ---")
    
    manifest_path = os.path.join(connector_path, 'manifest.yaml')
    schema_mapping_file = os.path.join(connector_path, 'schema_mapping.py')
    
    # Determine sample data file based on connector type (simplified for now)
    sample_data_file = None
    if "csv_connector" in connector_path:
        sample_data_file = os.path.join(connector_path, 'sample.csv')
    elif "json_connector" in connector_path:
        sample_data_file = os.path.join(connector_path, 'sample.json')
    # Add more conditions for other connector types as needed

    if not sample_data_file or not os.path.exists(sample_data_file):
        print(f"Error: Sample data file not found for {connector_path}")
        return False

    # 1. Read Manifest (simplified - just get schema_mapping_file and sample_data_file)
    print(f"Reading manifest from {manifest_path}")
    
    # 2. Load Schema Mapping Module Dynamically
    print(f"Loading schema mapping from {schema_mapping_file}")
    spec = importlib.util.spec_from_file_location("schema_mapping_module", schema_mapping_file)
    schema_mapping_module = importlib.util.module_from_spec(spec)
    sys.modules["schema_mapping_module"] = schema_mapping_module
    spec.loader.exec_module(schema_mapping_module)

    # Determine the mapping function based on connector type
    mapping_function = None
    if hasattr(schema_mapping_module, 'map_csv_to_intelgraph'):
        mapping_function = schema_mapping_module.map_csv_to_intelgraph
    elif hasattr(schema_mapping_module, 'map_json_to_intelgraph'):
        mapping_function = schema_mapping_module.map_json_to_intelgraph

    if not mapping_function:
        print("Error: No suitable mapping function found in schema mapping module.")
        return False

    # 3. Process Sample Data
    print(f"Processing sample data from {sample_data_file}")

    # Schema mapping functions now return (entities, relationships)
    entities_to_ingest, relationships_to_ingest = mapping_function(sample_data_file)
    print(f"Generated {len(entities_to_ingest)} entities and {len(relationships_to_ingest)} relationships for ingestion.")

    active_indexer = indexer or GraphMetadataIndexer()
    indexing_enabled = active_indexer.enabled
    if indexing_enabled:
        print("Incremental indexing enabled — streaming changes to Elasticsearch")
    else:
        print("Incremental indexing disabled (Elasticsearch not reachable)")

    # 4. Send to Mock Graph DB and index incrementally
    mock_db_client.clear_db() # Clear previous data for a clean run

    try:
        for entity in entities_to_ingest:
            mock_db_client.create_node(entity)
            if indexing_enabled:
                active_indexer.index_entity(entity)

        for rel in relationships_to_ingest:
            mock_db_client.create_relationship(rel)
            if indexing_enabled:
                active_indexer.index_relationship(rel)
    finally:
        if indexing_enabled:
            try:
                active_indexer.flush()
            except Exception as exc:
                print(f"Warning: failed to flush incremental index updates — {exc}")

    snapshot_file = export_graph_metadata_snapshot(
        entities_to_ingest,
        relationships_to_ingest,
        output_path=snapshot_path,
    )
    print(f"Graph metadata snapshot written to {snapshot_file}")

    print("Ingestion pipeline completed successfully.")

    # 5. Trigger a basic graph analytics function after ingestion
    print("\n--- Running post-ingestion analytics (Shortest Path) ---")
    graph_for_analytics = mock_db_client.get_graph_representation()
    
    # Example: Find shortest path between Alice and Project Alpha (if they exist in the graph)
    # This assumes 'Alice' and 'Project Alpha' are node IDs in the graph_representation
    # For the CSV connector, nodes are '1', '2', '3'. For JSON, 'user_1', 'proj_A', etc.
    
    # For CSV example (Alice is '1', Project X is '3')
    if "csv_connector" in connector_path:
        path = find_shortest_path(graph_for_analytics, '1', '3')
        print(f"Shortest path from Alice (1) to Project X (3): {path}")
    
    # For JSON example (Alice is 'user_1', Project Alpha is 'proj_A')
    elif "json_connector" in connector_path:
        path_alice_proj = find_shortest_path(graph_for_analytics, 'user_1', 'proj_A')
        print(f"Shortest path from Alice (user_1) to Project Alpha (proj_A): {path_alice_proj}")
        path_alice_org = find_shortest_path(graph_for_analytics, 'user_1', 'org_1')
        print(f"Shortest path from Alice (user_1) to Tech Solutions (org_1): {path_alice_org}")

    print("Post-ingestion analytics completed.")
    return True

if __name__ == '__main__':
    # Example usage:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, '..'))
    sys.path.insert(0, project_root) # Add project root to path for imports

    mock_db = MockGraphDBClient()
    
    # Run CSV connector ingestion and analytics
    csv_connector_path = os.path.join(project_root, 'connectors/csv_connector')
    run_ingestion_pipeline(csv_connector_path, mock_db)
    print("\n--- Mock DB Content After CSV Ingestion ---")
    print(f"Nodes: {mock_db.get_all_nodes()}")
    print(f"Relationships: {mock_db.get_all_relationships()}")

    # Run JSON connector ingestion and analytics
    mock_db_json = MockGraphDBClient()
    json_connector_path = os.path.join(project_root, 'connectors/json_connector')
    run_ingestion_pipeline(json_connector_path, mock_db_json)
    print("\n--- Mock DB Content After JSON Ingestion ---")
    print(f"Nodes: {mock_db_json.get_all_nodes()}")
    print(f"Relationships: {mock_db_json.get_all_relationships()}")
