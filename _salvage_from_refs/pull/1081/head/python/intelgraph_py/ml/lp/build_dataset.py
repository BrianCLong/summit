import argparse
import os
from datetime import datetime

from intelgraph_py.storage.neo4j_store import Neo4jStore


def build_dataset(since: datetime, split_type: str):
    """
    Builds a graph link prediction dataset from Neo4j.
    """
    print(f"Building dataset since {since} with split type {split_type}")

    # Read Neo4j connection details from environment variables
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    username = os.getenv("NEO4J_USERNAME", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "devpassword")
    database = os.getenv("NEO4J_DATABASE", "neo4j")

    # Initialize Neo4jStore
    store = Neo4jStore(uri, username, password, database=database)

    # Placeholder for dataset building logic
    print("Dataset building logic goes here.")
    print("This will involve Cypher queries to extract node/edge features and timestamps.")
    print("Example: Fetching all nodes (placeholder query)")
    try:
        # This is a placeholder query. Replace with actual data extraction queries.
        nodes = store.query("MATCH (n) RETURN n LIMIT 5")
        print(f"Fetched {len(nodes)} nodes from Neo4j (example query).")
        for node in nodes:
            print(node)
    except Exception as e:
        print(f"Error connecting to Neo4j or executing query: {e}")
        print("Please ensure Neo4j is running and accessible with the provided credentials.")

    print("It will also generate train/val/test splits without temporal leakage.")
    print("Finally, it will save datasets to Parquet/Arrow with metadata.")


def main():
    parser = argparse.ArgumentParser(description="Build graph link prediction dataset from Neo4j.")
    parser.add_argument(
        "--since",
        type=lambda s: datetime.strptime(s, "%Y-%m-%d"),
        help="Start date for data extraction (YYYY-MM-DD).",
    )
    parser.add_argument(
        "--split",
        dest="split_type",
        type=str,
        default="temporal",
        help="Type of data split (e.g., 'temporal').",
    )

    args = parser.parse_args()

    build_dataset(since=args.since, split_type=args.split_type)


if __name__ == "__main__":
    main()
