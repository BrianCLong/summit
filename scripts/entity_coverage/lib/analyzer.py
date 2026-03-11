import json
from collections import Counter

class EntityCoverageAnalyzer:
    def __init__(self, pg_conn, neo4j_driver):
        self.pg_conn = pg_conn
        self.neo4j_driver = neo4j_driver

    def analyze(self, tenant_id=None):
        results = {}
        results['entity_counts'] = self._get_entity_counts(tenant_id)
        results['document_coverage'] = self._get_document_coverage(tenant_id)
        results['entity_deserts'] = self._get_entity_deserts(tenant_id)
        results['entity_density'] = self._get_entity_density(tenant_id)
        results['ingestion_trends'] = self._get_ingestion_trends(tenant_id)
        results['domain_coverage'] = self._get_domain_coverage(tenant_id)
        results['kg_entity_counts'] = self._get_kg_entity_counts(tenant_id)
        return results

    def _get_entity_counts(self, tenant_id):
        with self.pg_conn.cursor() as cur:
            query = "SELECT kind, COUNT(*) FROM entities"
            params = []
            if tenant_id:
                query += " WHERE tenant_id = %s"
                params.append(tenant_id)
            query += " GROUP BY kind"
            cur.execute(query, params)
            return dict(cur.fetchall())

    def _get_kg_entity_counts(self, tenant_id):
        if not self.neo4j_driver:
            return {}

        try:
            with self.neo4j_driver.session() as session:
                query = "MATCH (n) RETURN labels(n)[0] as kind, count(*) as count"
                result = session.run(query)
                return {record["kind"]: record["count"] for record in result}
        except Exception as e:
            print(f"Warning: Failed to query Neo4j: {e}")
            return {}

    def _get_document_coverage(self, tenant_id):
        with self.pg_conn.cursor() as cur:
            query = """
                SELECT
                    COUNT(*) as total_docs,
                    COUNT(*) FILTER (WHERE array_length(entity_ids, 1) > 0) as docs_with_entities
                FROM documents
            """
            params = []
            if tenant_id:
                query += " WHERE tenant_id = %s"
                params.append(tenant_id)
            cur.execute(query, params)
            total, with_entities = cur.fetchone()
            coverage_pct = (with_entities / total * 100) if total > 0 else 0
            return {
                "total_documents": total,
                "documents_with_entities": with_entities,
                "coverage_percentage": round(coverage_pct, 2)
            }

    def _get_entity_deserts(self, tenant_id):
        with self.pg_conn.cursor() as cur:
            query = "SELECT id, title, source FROM documents WHERE (array_length(entity_ids, 1) IS NULL OR array_length(entity_ids, 1) = 0)"
            params = []
            if tenant_id:
                query += " AND tenant_id = %s"
                params.append(tenant_id)
            query += " LIMIT 1000"
            cur.execute(query, params)
            return [{"id": str(row[0]), "title": row[1], "source": row[2]} for row in cur.fetchall()]

    def _get_entity_density(self, tenant_id):
        with self.pg_conn.cursor() as cur:
            # SQL-based bucketing for scalability
            query = """
                WITH lengths AS (
                    SELECT COALESCE(array_length(entity_ids, 1), 0) as len
                    FROM documents
                    {where_clause}
                )
                SELECT
                    AVG(len) as average,
                    COUNT(*) FILTER (WHERE len = 0) as bucket_0,
                    COUNT(*) FILTER (WHERE len > 0 AND len <= 5) as bucket_1_5,
                    COUNT(*) FILTER (WHERE len > 5 AND len <= 10) as bucket_6_10,
                    COUNT(*) FILTER (WHERE len > 10 AND len <= 20) as bucket_11_20,
                    COUNT(*) FILTER (WHERE len > 20) as bucket_21_plus
                FROM lengths
            """
            params = []
            where_clause = ""
            if tenant_id:
                where_clause = "WHERE tenant_id = %s"
                params.append(tenant_id)

            cur.execute(query.format(where_clause=where_clause), params)
            row = cur.fetchone()

            return {
                "average_entities_per_doc": round(float(row[0]), 2) if row[0] is not None else 0,
                "distribution": {
                    "0": row[1],
                    "1-5": row[2],
                    "6-10": row[3],
                    "11-20": row[4],
                    "21+": row[5]
                }
            }

    def _get_ingestion_trends(self, tenant_id):
        with self.pg_conn.cursor() as cur:
            query = """
                SELECT
                    DATE_TRUNC('day', created_at) as day,
                    COUNT(*) as new_entities
                FROM entities
            """
            params = []
            if tenant_id:
                query += " WHERE tenant_id = %s"
                params.append(tenant_id)
            query += " GROUP BY day ORDER BY day"
            cur.execute(query, params)
            return [{"day": str(row[0]), "count": row[1]} for row in cur.fetchall()]

    def _get_domain_coverage(self, tenant_id):
        with self.pg_conn.cursor() as cur:
            query = """
                SELECT
                    source->>'system' as domain,
                    COUNT(*) as total_docs,
                    COUNT(*) FILTER (WHERE array_length(entity_ids, 1) > 0) as docs_with_entities
                FROM documents
            """
            params = []
            if tenant_id:
                query += " WHERE tenant_id = %s"
                params.append(tenant_id)
            query += " GROUP BY domain"
            cur.execute(query, params)
            results = []
            for domain, total, with_entities in cur.fetchall():
                results.append({
                    "domain": domain or "unknown",
                    "total_documents": total,
                    "coverage_percentage": round((with_entities / total * 100), 2) if total > 0 else 0
                })
            return results
