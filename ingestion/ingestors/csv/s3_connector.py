import os
import yaml
import boto3
import redis
import json
import pandas as pd
from neo4j import GraphDatabase
from prometheus_client import start_http_server, Counter
import threading

# Prometheus metric for ingest throughput
INGESTED_ROWS = Counter('ingested_rows_total', 'Total number of rows ingested', ['type'])

class S3CsvConnector:
    def __init__(self, mapping_path):
        self.mapping = self.load_mapping(mapping_path)
        self.s3_client = boto3.client('s3', endpoint_url=os.environ.get('S3_ENDPOINT_URL'))
        self.redis_client = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379'))
        self.neo4j_driver = GraphDatabase.driver(
            os.environ.get('NEO4J_URI'),
            auth=(os.environ.get('NEO4J_USERNAME'), os.environ.get('NEO4J_PASSWORD'))
        )
        self.ingest_queue_name = 'ingest-queue'

    def load_mapping(self, mapping_path):
        with open(mapping_path, 'r') as f:
            return yaml.safe_load(f)

    def process_entities(self, session, df, tenant_id):
        for entity_config in self.mapping.get('entities', []):
            entity_df = df[df['type'] == entity_config['type']]
            if not entity_df.empty:
                records = entity_df.to_dict('records')
                query = f"""
                UNWIND $records AS row
                MERGE (n:{entity_config['label']} {{id: row.id, tenant_id: $tenant_id}})
                SET n += row
                """
                session.run(query, records=records, tenant_id=tenant_id)
                INGESTED_ROWS.labels(type='entity').inc(len(records))

    def process_edges(self, session, df, tenant_id):
        for edge_config in self.mapping.get('edges', []):
            edge_df = df[df['type'] == edge_config['type']]
            if not edge_df.empty:
                records = edge_df.to_dict('records')
                query = f"""
                UNWIND $records AS row
                MATCH (source {{id: row.source_id, tenant_id: $tenant_id}})
                MATCH (target {{id: row.target_id, tenant_id: $tenant_id}})
                MERGE (source)-[r:{edge_config['type']}]->(target)
                SET r += row
                """
                session.run(query, records=records, tenant_id=tenant_id)
                INGESTED_ROWS.labels(type='edge').inc(len(records))

    def listen_for_jobs(self):
        print("Worker is listening for ingest jobs...")
        while True:
            try:
                job = self.redis_client.blpop(self.ingest_queue_name, timeout=0)
                if job:
                    job_data = json.loads(job[1])
                    source_key = job_data['source']
                    tenant_id = job_data['tenantId']
                    job_type = job_data['type']
                    bucket = self.mapping['source']['bucket']

                    print(f"Processing job for {bucket}/{source_key} (type: {job_type}) for tenant {tenant_id}")

                    obj = self.s3_client.get_object(Bucket=bucket, Key=source_key)
                    df = pd.read_csv(obj['Body'])

                    with self.neo4j_driver.session() as session:
                        if job_type == 'entities':
                            self.process_entities(session, df, tenant_id)
                        elif job_type == 'edges':
                            self.process_edges(session, df, tenant_id)

                    print(f"Finished processing {source_key}")
            except Exception as e:
                print(f"An error occurred: {e}")

if __name__ == '__main__':
    # Start Prometheus metrics server in a background thread
    start_http_server(8000)

    connector = S3CsvConnector('/app/ingestion/ingestors/csv/mapping.yaml')
    connector.listen_for_jobs()
