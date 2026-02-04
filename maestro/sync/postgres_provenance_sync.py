import logging
import os
from datetime import datetime
from typing import Any, Dict, List

try:
    import psycopg2
    from neo4j import GraphDatabase
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None
    GraphDatabase = None

logger = logging.getLogger(__name__)

class PostgresProvenanceSync:
    """
    Syncs provenance data (Runs, Artifacts) from Postgres to Neo4j.
    """
    def __init__(self, pg_conn_str: str, neo4j_uri: str, neo4j_auth: tuple):
        self.pg_conn_str = pg_conn_str
        self.neo4j_uri = neo4j_uri
        self.neo4j_auth = neo4j_auth
        self.driver = None

    def connect(self):
        if GraphDatabase:
            self.driver = GraphDatabase.driver(self.neo4j_uri, auth=self.neo4j_auth)
        else:
            logger.warning("neo4j driver not installed.")

    def close(self):
        if self.driver:
            self.driver.close()

    def sync_runs(self):
        if not psycopg2 or not self.driver:
            logger.warning("Missing dependencies (psycopg2 or neo4j). Skipping sync.")
            return

        try:
            conn = psycopg2.connect(self.pg_conn_str)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
        except Exception as e:
            logger.error(f"Failed to connect to Postgres: {e}")
            return

        try:
            # Fetch recent runs (assuming table 'runs' exists)
            # Adjust interval as needed or track last sync time
            cursor.execute("SELECT * FROM runs WHERE updated_at > NOW() - INTERVAL '1 hour'")
            runs = cursor.fetchall()

            with self.driver.session() as session:
                for run in runs:
                    session.execute_write(self._merge_run, run)

            logger.info(f"Synced {len(runs)} runs.")

            # Fetch artifacts (assuming table 'artifacts' exists)
            cursor.execute("SELECT * FROM artifacts WHERE created_at > NOW() - INTERVAL '1 hour'")
            artifacts = cursor.fetchall()

            with self.driver.session() as session:
                for artifact in artifacts:
                    session.execute_write(self._merge_artifact, artifact)

            logger.info(f"Synced {len(artifacts)} artifacts.")

        except Exception as e:
            logger.error(f"Error during sync: {e}")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    @staticmethod
    def _merge_run(tx, run):
        query = """
        MERGE (r:Run {id: $id})
        SET r.name = $name,
            r.owner = $owner,
            r.startedAt = $started_at,
            r.finishedAt = $finished_at,
            r.status = $status,
            r.costActual = $cost_actual
        MERGE (u:User {email: $owner})
        MERGE (u)-[:INITIATED]->(r)
        """
        # Handle potential missing keys gracefully or assuming model alignment
        tx.run(query,
               id=run['id'],
               name=run.get('name', 'Unknown Run'),
               owner=run.get('owner', 'unknown'),
               started_at=run.get('started_at'),
               finished_at=run.get('finished_at'),
               status=run.get('status'),
               cost_actual=run.get('cost_actual')
        )

    @staticmethod
    def _merge_artifact(tx, artifact):
        query = """
        MERGE (a:Artifact {id: $id})
        SET a.kind = $kind,
            a.path = $path_or_uri,
            a.contentHash = $content_hash,
            a.createdAt = $created_at

        WITH a
        MATCH (r:Run {id: $run_id})
        MERGE (r)-[:GENERATED]->(a)
        """
        tx.run(query,
               id=artifact['id'],
               kind=artifact.get('kind', 'other'),
               path_or_uri=artifact.get('path_or_uri'),
               content_hash=artifact.get('content_hash'),
               created_at=artifact.get('created_at'),
               run_id=artifact.get('run_id')
        )

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    pg_conn = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/summit")
    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_pass = os.getenv("NEO4J_PASSWORD", "password")

    syncer = PostgresProvenanceSync(pg_conn, neo4j_uri, (neo4j_user, neo4j_pass))
    try:
        syncer.connect()
        syncer.sync_runs()
    finally:
        syncer.close()
