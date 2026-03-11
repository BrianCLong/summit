#!/usr/bin/env python3
"""
Summit Ingestion Data Quality Audit Script
Checks document completeness, duplicates, entity yield, embeddings, and temporal gaps.
"""

import os
import json
import datetime
import logging
from typing import Dict, List, Any, Optional

import psycopg2
from psycopg2.extras import RealDictCursor
from neo4j import GraphDatabase

# --- Configuration ---

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("audit_ingestion")

# Postgres config
PG_HOST = os.environ.get("POSTGRES_HOST", "localhost")
PG_PORT = os.environ.get("POSTGRES_PORT", "5432")
PG_USER = os.environ.get("POSTGRES_USER", "postgres")
PG_PWD = os.environ.get("POSTGRES_PASSWORD", "postgres")
PG_DB = os.environ.get("POSTGRES_DB", "intelgraph")

# Neo4j config
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PWD = os.environ.get("NEO4J_PASSWORD", "password")

REPORT_JSON = "reports/dq-ingestion-report.json"
REPORT_MD = "reports/dq-ingestion-report.md"

# --- Audit Queries ---

SQL_DOC_COMPLETENESS = """
    SELECT id, tenant_id, collection_id, title, source_uri, hash
    FROM documents
    WHERE title IS NULL OR source_uri IS NULL OR hash IS NULL
"""

SQL_DUPLICATE_DETECTION = """
    SELECT hash, collection_id, count(*) as dupe_count
    FROM documents
    WHERE hash IS NOT NULL
    GROUP BY hash, collection_id
    HAVING count(*) > 1
"""

SQL_INGESTION_ERRORS = """
    SELECT collection_id,
           count(*) FILTER (WHERE processing_status = 'failed') as failed_count,
           count(*) as total_count
    FROM documents
    GROUP BY collection_id
"""

SQL_SCHEMA_FAILURES = """
    SELECT id, tenant_id, schema_id, created_at
    FROM ingest_events
    WHERE processed_at IS NULL
"""

# Note: vector_norm requires pgvector 0.5.0+.
# For zero-magnitude check, we check if the vector is equal to a zero vector if possible,
# or use vector_norm(embedding) = 0.
SQL_EMBEDDING_HEALTH = """
    SELECT id, document_id, embedding IS NULL as is_null,
           (vector_norm(embedding) = 0) as is_zero
    FROM doc_chunks
    WHERE embedding IS NULL OR (vector_norm(embedding) = 0)
"""

SQL_TEMPORAL_GAPS = """
    WITH doc_times AS (
        SELECT collection_id, created_at,
               LAG(created_at) OVER (PARTITION BY collection_id ORDER BY created_at) as prev_ts
        FROM documents
    )
    SELECT collection_id, created_at, prev_ts,
           (created_at - prev_ts) as gap_interval
    FROM doc_times
    WHERE prev_ts IS NOT NULL AND (created_at - prev_ts) > INTERVAL '24 hours'
"""

CYPHER_ENTITY_YIELD = """
    MATCH (e:MultimodalEntity)-[:EXTRACTED_FROM]->(s:MediaSource)
    RETURN s.id as source_id, labels(s) as labels, count(e) as entity_count
"""

# --- Audit Engine ---

class IngestionAuditor:
    def __init__(self):
        self.pg_conn = None
        self.neo4j_driver = None
        self.results = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "metrics": {},
            "flags": []
        }

    def connect(self):
        try:
            self.pg_conn = psycopg2.connect(
                host=PG_HOST, port=PG_PORT, user=PG_USER, password=PG_PWD, dbname=PG_DB,
                cursor_factory=RealDictCursor
            )
            logger.info("Connected to PostgreSQL")
        except Exception as e:
            logger.warning(f"Could not connect to PostgreSQL: {e}")

        try:
            self.neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PWD))
            self.neo4j_driver.verify_connectivity()
            logger.info("Connected to Neo4j")
        except Exception as e:
            logger.warning(f"Could not connect to Neo4j: {e}")

    def run_pg_query(self, query: str) -> List[Dict]:
        if not self.pg_conn:
            return []
        with self.pg_conn.cursor() as cur:
            cur.execute(query)
            return cur.fetchall()

    def run_neo4j_query(self, query: str) -> List[Dict]:
        if not self.neo4j_driver:
            return []
        try:
            with self.neo4j_driver.session() as session:
                result = session.run(query)
                return [record.data() for record in result]
        except Exception as e:
            logger.warning(f"Neo4j query failed: {e}")
            return []

    def audit_documents(self):
        logger.info("Auditing documents...")

        # Completeness
        incomplete = self.run_pg_query(SQL_DOC_COMPLETENESS)
        self.results["metrics"]["incomplete_docs"] = {
            "count": len(incomplete),
            "samples": incomplete[:10]
        }
        if len(incomplete) > 0:
            self.results["flags"].append({"severity": "HIGH", "message": f"Found {len(incomplete)} documents with missing core fields."})

        # Duplicates
        dupes = self.run_pg_query(SQL_DUPLICATE_DETECTION)
        self.results["metrics"]["duplicate_docs"] = {
            "count": sum(d["dupe_count"] - 1 for d in dupes),
            "groups": len(dupes)
        }
        if len(dupes) > 0:
            self.results["flags"].append({"severity": "MEDIUM", "message": f"Found {len(dupes)} groups of duplicate documents."})

        # Error Rates
        errors = self.run_pg_query(SQL_INGESTION_ERRORS)
        self.results["metrics"]["ingestion_performance"] = errors
        for source in errors:
            rate = (source["failed_count"] / source["total_count"]) * 100 if source["total_count"] > 0 else 0
            if rate > 5:
                self.results["flags"].append({"severity": "CRITICAL", "message": f"High error rate ({rate:.1f}%) in collection {source['collection_id']}"})

    def audit_events(self):
        logger.info("Auditing ingest events...")
        failures = self.run_pg_query(SQL_SCHEMA_FAILURES)
        self.results["metrics"]["schema_validation_failures"] = {
            "count": len(failures),
            "samples": [str(f) for f in failures[:10]]
        }
        if len(failures) > 0:
            self.results["flags"].append({"severity": "HIGH", "message": f"Found {len(failures)} unprocessed/invalid ingest events."})

    def audit_embeddings(self):
        logger.info("Auditing embeddings...")
        health = self.run_pg_query(SQL_EMBEDDING_HEALTH)
        null_count = sum(1 for r in health if r["is_null"])
        zero_count = sum(1 for r in health if r["is_zero"])
        self.results["metrics"]["embedding_health"] = {
            "null_count": null_count,
            "zero_magnitude_count": zero_count
        }
        if null_count > 0 or zero_count > 0:
            self.results["flags"].append({"severity": "HIGH", "message": f"Found {null_count} null and {zero_count} zero-magnitude embeddings."})

    def audit_temporal_gaps(self):
        logger.info("Auditing temporal gaps...")
        gaps = self.run_pg_query(SQL_TEMPORAL_GAPS)
        # Convert intervals to string for JSON serialization
        serializable_gaps = []
        for g in gaps:
            g_copy = dict(g)
            g_copy["created_at"] = g["created_at"].isoformat()
            g_copy["prev_ts"] = g["prev_ts"].isoformat()
            g_copy["gap_interval"] = str(g["gap_interval"])
            serializable_gaps.append(g_copy)

        self.results["metrics"]["temporal_gaps"] = {
            "count": len(gaps),
            "details": serializable_gaps[:10]
        }
        if len(gaps) > 0:
            self.results["flags"].append({"severity": "MEDIUM", "message": f"Found {len(gaps)} temporal gaps exceeding 24h."})

    def audit_entity_yield(self):
        logger.info("Auditing entity yield...")
        yields = self.run_neo4j_query(CYPHER_ENTITY_YIELD)
        self.results["metrics"]["entity_yield"] = yields
        if len(yields) > 0:
            avg_yield = sum(y["entity_count"] for y in yields) / len(yields)
            if avg_yield < 1:
                self.results["flags"].append({"severity": "LOW", "message": f"Low average entity yield per source: {avg_yield:.2f}"})

    def generate_reports(self):
        logger.info(f"Generating reports to {REPORT_JSON} and {REPORT_MD}")
        os.makedirs(os.path.dirname(REPORT_JSON), exist_ok=True)

        with open(REPORT_JSON, "w") as f:
            json.dump(self.results, f, indent=2)

        md = f"# Ingestion Data Quality Audit Report\n"
        md += f"**Timestamp**: {self.results['timestamp']}\n\n"

        if self.results["flags"]:
            md += "## ⚠️ Actionable Flags\n"
            for flag in self.results["flags"]:
                md += f"- **[{flag['severity']}]** {flag['message']}\n"
            md += "\n"
        else:
            md += "✅ No critical quality issues detected.\n\n"

        md += "## Metrics Summary\n"
        metrics = self.results["metrics"]
        md += f"- **Incomplete Documents**: {metrics.get('incomplete_docs', {}).get('count', 'N/A')}\n"
        md += f"- **Duplicate Documents**: {metrics.get('duplicate_docs', {}).get('count', 'N/A')}\n"
        md += f"- **Schema Failures**: {metrics.get('schema_validation_failures', {}).get('count', 'N/A')}\n"
        md += f"- **Temporal Gaps (>24h)**: {metrics.get('temporal_gaps', {}).get('count', 'N/A')}\n"

        eh = metrics.get('embedding_health', {})
        md += f"- **Embedding Health**: {eh.get('null_count', 0)} null, {eh.get('zero_magnitude_count', 0)} zero magnitude\n\n"

        if "ingestion_performance" in metrics:
            md += "### Ingestion Performance by Collection\n"
            md += "| Collection ID | Total | Failed | Error Rate |\n"
            md += "|---|---|---|---|\n"
            for s in metrics["ingestion_performance"]:
                rate = (s['failed_count'] / s['total_count']) * 100 if s['total_count'] > 0 else 0
                md += f"| {s['collection_id']} | {s['total_count']} | {s['failed_count']} | {rate:.1f}% |\n"
            md += "\n"

        with open(REPORT_MD, "w") as f:
            f.write(md)

    def close(self):
        if self.pg_conn:
            self.pg_conn.close()
        if self.neo4j_driver:
            self.neo4j_driver.close()

def main():
    auditor = IngestionAuditor()
    auditor.connect()

    try:
        auditor.audit_documents()
        auditor.audit_events()
        auditor.audit_embeddings()
        auditor.audit_temporal_gaps()
        auditor.audit_entity_yield()
        auditor.generate_reports()
    finally:
        auditor.close()

if __name__ == "__main__":
    main()
