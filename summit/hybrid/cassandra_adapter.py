import os

class CassandraAdapter:
    def __init__(self):
        self.enabled = os.getenv("HYBRID_SOURCES", "off") == "on"

    def fetch_attributes(self, entity_id: str):
        if not self.enabled:
            return None
        # Stub for Cassandra query
        return {"entity_id": entity_id, "source": "cassandra", "attributes": {}}
