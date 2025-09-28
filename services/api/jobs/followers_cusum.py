import psycopg2, os, numpy as np
from neo4j import GraphDatabase

dsn = os.getenv("POSTGRES_DSN","postgresql://postgres:pgpass@postgres:5432/intelgraph")
driver = GraphDatabase.driver("bolt://neo4j:7687", auth=("neo4j","neo4jpass"))

def run():
    cx = psycopg2.connect(dsn); cx.autocommit=True
    cur = cx.cursor()
    cur.execute("""
      WITH s AS (
        SELECT source, account_id, ts, followers,
               followers - LAG(followers) OVER (PARTITION BY source, account_id ORDER BY ts) AS df
        FROM account_metrics
      )
      SELECT source, account_id, array_remove(array_agg(df ORDER BY ts), NULL)::float8[] AS diffs
      FROM s GROUP BY source, account_id
    """)
    rows = cur.fetchall()

    for src, acc, diffs in rows:
        if not diffs or len(diffs) < 20: continue
        mu = float(np.mean(diffs)); sigma = float(np.std(diffs) or 1.0)
        k = 0.5*sigma; h = 5*sigma
        gpos = 0.0; gneg = 0.0; alarms = 0
        for d in diffs:
            gpos = max(0.0, gpos + (d - mu - k))
            gneg = max(0.0, gneg - (d - mu + k))
            if gpos > h or gneg > h:
                alarms += 1; gpos = 0.0; gneg = 0.0
        if alarms >= 1:
            with driver.session() as s:
                s.run("""
                    MERGE (a:Account {id:$id, source:$src})
                    SET a.follower_anomaly = coalesce(a.follower_anomaly,0)+$alarms, a.follower_anomaly_updated=datetime()
                """, {"id":acc,"src":src,"alarms":int(alarms)})