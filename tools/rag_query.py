#!/usr/bin/env python3
import http.client
import json
import sys

import duckdb

q = " ".join(sys.argv[1:]).strip()
if q.startswith("q="):
    q = q[2:]
if not q:
    print("usage: rag_query.py <question>")
    sys.exit(1)

con = duckdb.connect("rag/index/rag.duckdb")

# Embedding
econn = http.client.HTTPConnection("127.0.0.1", 11434, timeout=60)
econn.request(
    "POST",
    "/api/embeddings",
    json.dumps({"model": "nomic-embed-text", "prompt": q}),
    {"Content-Type": "application/json"},
)
edata = json.loads(econn.getresponse().read())
emb = edata.get("embedding", [])
if not emb or len(emb) != 768:
    print("(error) embedding failed or dimension mismatch", file=sys.stderr)
    sys.exit(2)

# Score in Python (portable)
rows = con.execute("SELECT path, chunk, emb FROM docs").fetchall()


def cosine_sim(a, b):
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b, strict=False):
        dot += x * y
        na += x * x
        nb += y * y
    denom = (na**0.5) * (nb**0.5) or 1e-12
    return dot / denom


scored = [(p, c, cosine_sim(e, emb)) for (p, c, e) in rows]
scored.sort(key=lambda t: t[2], reverse=True)
top = scored[:5]

context = "\n---\n".join(f"[{i + 1}] {r[1][:800]}" for i, r in enumerate(top))
messages = [
    {"role": "system", "content": "Answer concisely and cite [1], [2]."},
    {"role": "user", "content": f"Question: {q}\n\nContext:\n{context}"},
]

lconn = http.client.HTTPConnection("127.0.0.1", 4000, timeout=120)
lconn.request(
    "POST",
    "/v1/chat/completions",
    json.dumps({"model": "local/llama", "messages": messages}),
    {"Content-Type": "application/json", "Authorization": "Bearer sk"},
)
resp = json.loads(lconn.getresponse().read())
print(resp["choices"][0]["message"]["content"])
