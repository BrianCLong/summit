import os
import uuid

from sqlalchemy import text

from intelgraph_py.database import get_db
from intelgraph_py.storage.neo4j_store import Neo4jStore


class SyncEntity:
    """Mock Entity class compatible with Neo4jStore.upsert_entity"""
    def __init__(self, id, type, props):
        self.id = id
        self.type = type
        self.props = props

def sync_provenance():
    # 1. Connect to Postgres
    db = next(get_db())

    # 2. Connect to Neo4j
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "password")
    neo4j_store = Neo4jStore(uri, user, password)

    try:
        # Example query: Fetch provenance tokens from provsql tables (simplified)
        # Note: provsql schemas are complex. This is a placeholder for the sync logic.
        # We assume there's a table 'provenance_events' or we query provsql views.

        # We query for provsql tables presence first.
        query = text("SELECT * FROM information_schema.tables WHERE table_name = 'provenance_circuit_wire'")
        result = db.execute(query).fetchall()

        if not result:
            print("ProvSQL tables not found. Mocking data for demonstration.")
            # Create mock data
            mock_data = [
                {"id": str(uuid.uuid4()), "type": "ProvenanceNode", "props": {"label": "Data A", "prov_type": "entity"}},
                {"id": str(uuid.uuid4()), "type": "ProvenanceNode", "props": {"label": "Process B", "prov_type": "activity"}},
            ]
        else:
            print(f"Found {len(result)} provenance tables/entries. Fetching data...")
            # Ideally fetch real data here
            mock_data = []

        print(f"Syncing {len(mock_data)} items to Graph.")

        for item in mock_data:
            entity = SyncEntity(id=item["id"], type=item["type"], props=item["props"])
            neo4j_store.upsert_entity(entity)
            print(f"Upserted entity {item['id']}")

    except Exception as e:
        print(f"Error syncing provenance: {e}")
    finally:
        db.close()
        neo4j_store.close()

if __name__ == "__main__":
    sync_provenance()
