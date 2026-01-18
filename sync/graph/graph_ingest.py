import json
import os
from intelgraph_neo4j_client import IntelGraphNeo4jClient

class LineageGraphIngest:
    def __init__(self, neo4j_config=None):
        self.config = neo4j_config or {
            "neo4j_uri": os.environ.get("NEO4J_URI", "bolt://localhost:7687"),
            "neo4j_username": os.environ.get("NEO4J_USER", "neo4j"),
            "neo4j_password": os.environ.get("NEO4J_PASSWORD", "password"),
        }
        try:
            self.client = IntelGraphNeo4jClient(self.config)
        except Exception as e:
            print(f"Could not initialize Neo4j client: {e}")
            self.client = None

    def ingest_postgres_lineage(self, lineage_file):
        if not os.path.exists(lineage_file):
            print(f"Lineage file {lineage_file} not found.")
            return

        with open(lineage_file, "r") as f:
            data = json.load(f)

        print(f"Ingesting {len(data)} lineage entries into Neo4j...")
        for entry in data:
            node_props = {
                "id": f"pg:{entry['tuple_id']}",
                "name": f"Tuple {entry['tuple_id']}",
                "type": "tuple",
                "namespace": "postgres",
                "prov_token": entry['provenance']
            }
            if self.client:
                try:
                    self.client.create_or_update_entity("LineageNode", node_props)
                except Exception as e:
                    print(f"Error ingesting node {node_props['id']}: {e}")
            else:
                print(f"Mock Ingest Node: {node_props['id']}")

    def ingest_openlineage_events(self, log_file):
        if not os.path.exists(log_file):
            print(f"Log file {log_file} not found.")
            return

        with open(log_file, "r") as f:
            lines = f.readlines()

        print(f"Ingesting {len(lines)} OpenLineage events into Neo4j...")
        for line in lines:
            event = json.loads(line)
            job_name = event['job']['name']
            run_id = event['run']['runId']

            activity_props = {
                "id": run_id,
                "runId": run_id,
                "jobName": job_name,
                "status": event['eventType'],
                "startedAt": event['eventTime'] if event['eventType'] == "START" else None,
                "completedAt": event['eventTime'] if event['eventType'] == "COMPLETE" else None,
            }

            if self.client:
                try:
                    self.client.create_or_update_entity("ActivityNode", activity_props)

                    # Ingest inputs
                    for input_ds in event.get('inputs', []):
                        ds_id = f"{input_ds['namespace']}:{input_ds['name']}"
                        self.client.create_or_update_entity("LineageNode", {
                            "id": ds_id,
                            "name": input_ds['name'],
                            "namespace": input_ds['namespace'],
                            "type": "dataset"
                        })
                        self.client.create_relationship("ActivityNode", "id", run_id,
                                                       "LineageNode", "id", ds_id, "USED")

                    # Ingest outputs
                    for output_ds in event.get('outputs', []):
                        ds_id = f"{output_ds['namespace']}:{output_ds['name']}"
                        self.client.create_or_update_entity("LineageNode", {
                            "id": ds_id,
                            "name": output_ds['name'],
                            "namespace": output_ds['namespace'],
                            "type": "dataset"
                        })
                        self.client.create_relationship("ActivityNode", "id", run_id,
                                                       "LineageNode", "id", ds_id, "PRODUCED")
                except Exception as e:
                    print(f"Error ingesting activity {run_id}: {e}")
            else:
                print(f"Mock Ingest Activity: {run_id} ({job_name})")

if __name__ == "__main__":
    ingestor = LineageGraphIngest()
    ingestor.ingest_postgres_lineage("provenance/postgres_lineage.json")
    ingestor.ingest_openlineage_events("lineage_events.log")
