import json
import psycopg2
from psycopg2.extras import RealDictCursor

class WarehouseClient:
    def __init__(self, db_conn):
        self.db_conn = db_conn

    def store_metrics(self, metrics):
        query = """
        INSERT INTO graph_degree_metrics_v1 (
            tenant_id, label, window_start, window_end, sample_n,
            mean_deg, skew_deg, top1p_mass, evidence_id
        ) VALUES (
            %(tenant_id)s, %(label)s, %(window_start)s, %(window_end)s, %(sample_n)s,
            %(mean_deg)s, %(skew_deg)s, %(top1p_mass)s, %(evidence_id)s
        )
        ON CONFLICT (tenant_id, label, window_end) DO UPDATE SET
            sample_n = EXCLUDED.sample_n,
            mean_deg = EXCLUDED.mean_deg,
            skew_deg = EXCLUDED.skew_deg,
            top1p_mass = EXCLUDED.top1p_mass,
            evidence_id = EXCLUDED.evidence_id
        """
        with self.db_conn.cursor() as cursor:
            cursor.execute(query, metrics)
            self.db_conn.commit()

    def get_baseline_metrics(self, tenant_id, label, reference_time, days=14):
        query = """
        SELECT mean_deg, skew_deg, top1p_mass
        FROM graph_degree_metrics_v1
        WHERE tenant_id = %s AND label = %s
        AND window_end < %s
        AND window_end >= %s::timestamp - INTERVAL %s
        ORDER BY window_end DESC
        """
        interval_str = f"{days} days"
        with self.db_conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, (tenant_id, label, reference_time, reference_time, interval_str))
            return cursor.fetchall()
