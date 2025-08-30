#!/usr/bin/env python3
import glob
import http.client
import json
import os
import sys
import time

import duckdb

DB = "rag/index/rag.duckdb"
os.makedirs("rag/index", exist_ok=True)


def embed(text: str):
    for attempt in range(3):
        try:
            conn = http.client.HTTPConnection("127.0.0.1", 11434, timeout=60)
            body = json.dumps({"model": "nomic-embed-text", "prompt": text}).encode()
            conn.request("POST", "/api/embeddings", body, {"Content-Type": "application/json"})
            data = json.loads(conn.getresponse().read())
            emb = data.get("embedding", [])
            if isinstance(emb, list) and len(emb) == 768:
                return emb
        except Exception:
            pass
        time.sleep(0.1 * (attempt + 1))
    return None


con = duckdb.connect(DB)
con.execute(
    """
CREATE TABLE IF NOT EXISTS docs(
  id    INTEGER,
  path  TEXT,
  chunk TEXT,
  emb   FLOAT[768]
);
"""
)

docs = sorted(
    glob.glob("rag/corpus/**/*.md", recursive=True)
    + glob.glob("rag/corpus/**/*.txt", recursive=True)
)
if not docs:
    print("No docs in rag/corpus. Add .md/.txt then re-run.", file=sys.stderr)

i = 0
skipped = 0
for p in docs:
    with open(p, errors="ignore") as f:
        txt = f.read()
    for chunk in [txt[x : x + 800] for x in range(0, len(txt), 800)]:
        if not chunk.strip():
            continue
        e = embed(chunk)
        if e is None:
            skipped += 1
            continue
        con.execute("INSERT INTO docs VALUES (?, ?, ?, ?)", (i, p, chunk, e))
        i += 1

print(f"Indexed {i} chunks (skipped {skipped}) into {DB}")
