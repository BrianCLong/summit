from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
from neo4j import GraphDatabase
import psycopg2, os

NEO=GraphDatabase.driver("bolt://neo4j:7687", auth=("neo4j","neo4jpass"))
DSN=os.getenv("POSTGRES_DSN","postgresql://postgres:pgpass@postgres:5432/intelgraph")

def prune_neo4j(days=None):
    days = days or int(os.getenv("MESSAGES_RETENTION_DAYS","90"))
    # per-source overrides
    src_over = {
        "TWITTER": int(os.getenv("MESSAGES_RETENTION_TWITTER_DAYS", str(days))),
        "REDDIT":  int(os.getenv("MESSAGES_RETENTION_REDDIT_DAYS", str(days))),
    }
    with NEO.session() as s:
        # global prune
        s.run("MATCH (m:Message) WHERE m.ts < datetime().epochMillis - $ms DETACH DELETE m",
              {"ms": days*24*3600*1000})
        # source overrides
        for src, d in src_over.items():
            s.run("""
              MATCH (m:Message {source:$src})
              WHERE m.ts < datetime().epochMillis - $ms
              AND NOT ( (:Case {legal_hold:true})-[:INCLUDES]->()--(m) )
              DETACH DELETE m
            """, {"src": src, "ms": d*24*3600*1000})

def prune_audit(days=None):
    days = days or int(os.getenv("AUDIT_RETENTION_DAYS","365"))
    cx=psycopg2.connect(DSN); cx.autocommit=True
    with cx.cursor() as cur:
        cur.execute("DELETE FROM audit_log WHERE ts < now() - interval '%s days'", (days,))

with DAG("retention", start_date=datetime(2025,9,1), schedule="0 4 * * *", catchup=False) as dag:
    neo = PythonOperator(task_id="prune_neo4j", python_callable=prune_neo4j)
    aud = PythonOperator(task_id="prune_audit", python_callable=prune_audit)
    neo >> aud