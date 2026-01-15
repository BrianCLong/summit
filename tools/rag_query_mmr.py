#!/usr/bin/env python3
import http.client
import json
import math
import sys

import duckdb

DB = "rag/index/rag.duckdb"
q = " ".join(sys.argv[1:]).strip()
if not q:
    print("usage: rag_query_mmr.py <question>")
    sys.exit(1)


# embed helper
def embed(text: str):
    conn = http.client.HTTPConnection("127.0.0.1", 11434, timeout=60)
    body = json.dumps({"model": "nomic-embed-text", "input": text})
    conn.request("POST", "/api/embeddings", body, {"Content-Type": "application/json"})
    data = json.loads(conn.getresponse().read())
    return data.get("embedding", [])


# cosine
def cos(a, b):
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    na = math.sqrt(sum(x * x for x in a)) or 1e-12
    nb = math.sqrt(sum(x * x for x in b)) or 1e-12
    return dot / (na * nb)


# MMR (λ balances relevance vs novelty)
def mmr(candidates, query_emb, k=5, lam=0.5):
    selected = []
    cand = set(range(len(candidates)))
    while len(selected) < min(k, len(candidates)):
        best_idx = None
        best_score = -1
        for i in cand:
            rel = cos(candidates[i]["emb"], query_emb)
            div = (
                0.0
                if not selected
                else max(cos(candidates[i]["emb"], candidates[j]["emb"]) for j in selected)
            )
            score = lam * rel - (1 - lam) * div
            if score > best_score:
                best_score = score
                best_idx = i
        selected.append(best_idx)
        cand.remove(best_idx)
    return [candidates[i] for i in selected]


# load all docs (small local corpora ok)
con = duckdb.connect(DB)
rows = con.execute("SELECT path, chunk, emb FROM docs").fetchall()
qe = embed(q)
cands = [{"path": p, "chunk": c, "emb": e} for (p, c, e) in rows if e]
top = mmr(cands, qe, k=5, lam=0.6)

context = "\n---\n".join(f"[{i + 1}] {t['chunk'][:800]}" for i, t in enumerate(top))
messages = [
    {"role": "system", "content": "Answer briefly with citations like [1], [2]."},
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
