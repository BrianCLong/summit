import json
import os

import psycopg2
from kafka import KafkaConsumer
from neo4j import GraphDatabase

CONSUMER_NAME = os.getenv("CDC_CONSUMER_NAME", "cdc-to-neo4j")
PG_DSN = os.getenv("PG_DSN")  # e.g. "postgres://user:pass@host:5432/db"
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASS = os.getenv("NEO4J_PASS")
KAFKA_BOOT = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")
TOPIC_PREFIX = os.getenv("CDC_TOPIC_PREFIX", "summit.postgres")

def fetch_last_lsn():
    with psycopg2.connect(PG_DSN) as conn, conn.cursor() as cur:
        cur.execute("SELECT last_lsn FROM cdc_consumer_checkpoints WHERE consumer_name=%s", (CONSUMER_NAME,))
        row = cur.fetchone()
        return row[0] if row else "0/0"

def update_last_lsn(lsn):
    with psycopg2.connect(PG_DSN) as conn, conn.cursor() as cur:
        cur.execute("SELECT set_consumer_lsn(%s, %s)", (CONSUMER_NAME, lsn))

def lsn_le(a, b):
    # compare pg_lsn strings "X/Y"
    ax, ay = [int(x, 16) for x in a.split("/")]
    bx, by = [int(x, 16) for x in b.split("/")]
    return (ax, ay) <= (bx, by)

def main():
    last_lsn = fetch_last_lsn()
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
    consumer = KafkaConsumer(
        f"{TOPIC_PREFIX}.public.*",
        bootstrap_servers=[KAFKA_BOOT],
        group_id=CONSUMER_NAME,
        enable_auto_commit=False,
        value_deserializer=lambda m: json.loads(m.decode("utf-8"))
    )
    with driver.session() as session:
        for msg in consumer:
            evt = msg.value
            # Debezium payload with source.lsn + op (c,u,d,r)
            payload = evt.get("payload") or evt
            src = payload.get("source", {})
            op = payload.get("op")
            lsn = src.get("lsn") or src.get("lsn_commit") or "0/0"
            if lsn_le(lsn, last_lsn):
                consumer.commit()
                continue

            after = payload.get("after") or {}
            before = payload.get("before") or {}
            commit_ts = payload.get("ts_ms")

            # Example: route by table
            table = src.get("table")
            if table == "users":
                def tx_fn(tx):
                    # Node upsert
                    if op == "d":
                        tx.run("""
                          MERGE (n:User {user_id: $id})
                          SET n.__tombstone__ = true,
                              n.deleted_at = datetime({epochMillis:$ts}),
                              n.applied_lsn = $lsn
                        """, id=before.get("id"), ts=commit_ts, lsn=lsn)
                    else:
                        tx.run("""
                          MERGE (n:User {user_id: $id})
                          SET n += $props,
                              n.applied_lsn = $lsn,
                              n.__tombstone__ = coalesce(n.__tombstone__, false)
                        """, id=after.get("id"), props=after, lsn=lsn)

                session.execute_write(tx_fn)

            # TODO: add relationship merges with APOC in batch workers
            update_last_lsn(lsn)
            last_lsn = lsn
            consumer.commit()

if __name__ == "__main__":
    main()
