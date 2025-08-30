#!/usr/bin/env python3
import os
import sys

import duckdb

db = "rag/index/rag.duckdb"
if not os.path.exists(db):
    print("No index at", db)
    sys.exit(1)
con = duckdb.connect(db)
n = con.execute("select count(*) from docs").fetchone()[0]
p = con.execute("select count(distinct path) from docs").fetchone()[0]
print(f"docs rows: {n}  unique files: {p}")
rows = con.execute(
    "select path, count(*) as c from docs group by path order by c desc limit 10"
).fetchall()
for path, c in rows:
    print(f"{c:4d}  {path}")
