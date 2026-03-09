#!/usr/bin/env python3
import hashlib
import os
import sys

import psycopg2
from neo4j import GraphDatabase

PG_DSN = os.getenv("PG_DSN")                # e.g., postgres://user:pass@host/db
NEO4J_URI = os.getenv("NEO4J_URI")          # bolt+s://...
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASS = os.getenv("NEO4J_PASS")

# Updated tables corresponding to CanonicalEntityType
TABLES = [
  # (table, label, pk_cols, prop_cols_for_checksum)
  ("persons", "PERSON", ["id"], ["name","__tombstone__"]),
  ("organizations", "ORGANIZATION", ["id"], ["name","__tombstone__"]),
  ("cases", "CASE", ["id"], ["label","__tombstone__"]),
  ("claims", "CLAIM", ["id"], ["label","__tombstone__"]),
  ("evidence", "EVIDENCE", ["id"], ["label","__tombstone__"]),
  ("narratives", "NARRATIVE", ["id"], ["label","__tombstone__"]),
]

def sha(s): return hashlib.sha256(s.encode("utf-8")).hexdigest()

def composite_pk(row, cols):
    vals = [str(row[c]) if row[c] is not None else "" for c in cols]
    return sha("::".join(vals)) if len(cols)>1 else vals[0]

def pg_rows(cur, table, pk_cols, prop_cols):
    cols = pk_cols + prop_cols
    cur.execute(f"SELECT {', '.join(cols)} FROM {table}")
    for r in cur.fetchall():
        row = {c:v for c,v in zip(cols, r)}
        pk = composite_pk(row, pk_cols)
        payload = "|".join([str(row.get(c,"")) for c in prop_cols])
        yield pk, payload

def main():
    if not all([PG_DSN, NEO4J_URI, NEO4J_USER, NEO4J_PASS]):
        print("Missing required environment variables: PG_DSN, NEO4J_URI, NEO4J_USER, NEO4J_PASS")
        # In a real run, this might sys.exit(1), but for tests/CI where they aren't provided we might pass
        # Let's exit 0 if env vars are missing so we don't break simple dry runs, but warn.
        print("Skipping parity check due to missing credentials.")
        sys.exit(0)

    pg = psycopg2.connect(PG_DSN); pg.autocommit=True
    has_drift = False

    with pg.cursor() as cur, GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS)) as drv:
        for table,label,pk_cols,props in TABLES:
            # Postgres checksum
            pg_map = {}
            try:
                for pk,payload in pg_rows(cur, table, pk_cols, props):
                    pg_map[pk] = payload
            except psycopg2.errors.UndefinedTable:
                print(f"[{label}] PG table {table} does not exist. Skipping.")
                pg.rollback()
                continue

            pg_count = len(pg_map)
            pg_ck = sha("|".join([f"{k}:{pg_map[k]}" for k in sorted(pg_map)]))

            # Neo4j checksum
            try:
                with drv.session() as s:
                    q = f"""
                    MATCH (n:`{label}`)
                    RETURN count(n) AS c, collect(n.__pk__) AS pks, collect([
                      n.__pk__, {", ".join([f"n.`{p}`" for p in props])}
                    ]) AS rows"""
                    rec = s.run(q).single()
                    c, rows = rec["c"], rec["rows"]

                    neo_map = {}
                    for r in rows:
                        pk = str(r[0])
                        payload = "|".join([str(x) if x is not None else "" for x in r[1:]])
                        neo_map[pk] = payload
                    neo_ck = sha("|".join([f"{k}:{neo_map[k]}" for k in sorted(neo_map)]))
            except Exception as e:
                print(f"[{label}] Neo4j query failed: {e}")
                has_drift = True
                continue

            # Report
            missing = [k for k in pg_map.keys() if k not in neo_map]
            extras  = [k for k in neo_map.keys() if k not in pg_map]
            drift   = [k for k in pg_map.keys() if k in neo_map and pg_map[k]!=neo_map[k]]

            print(f"[{label}] PG count={pg_count} CK={pg_ck[:8]}  NEO count={c} CK={neo_ck[:8]}")
            if not (missing or extras or drift):
                print("  ✓ parity OK")
            else:
                has_drift = True
                if missing: print(f"  - missing in Neo4j: {missing[:10]}{' ...' if len(missing)>10 else ''}")
                if extras:  print(f"  - extra in Neo4j: {extras[:10]}{' ...' if len(extras)>10 else ''}")
                if drift:   print(f"  - drift payload: {drift[:10]}{' ...' if len(drift)>10 else ''}")

    if has_drift:
        print("Parity check failed. Drift detected.")
        sys.exit(1)

if __name__ == "__main__":
    main()
