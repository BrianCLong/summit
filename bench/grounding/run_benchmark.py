import os, json, orjson, time, hashlib, numpy as np, pandas as pd
from tqdm import tqdm
from neo4j import GraphDatabase
from sentence_transformers import SentenceTransformer
import faiss

SEED = int(os.getenv("EMBEDDING_SEED", "20240101"))
np.random.seed(SEED)

def h(s): return hashlib.sha256(s.encode()).hexdigest()

def neo():
    drv = GraphDatabase.driver(os.environ["NEO4J_URI"],
                               auth=(os.environ["NEO4J_USER"], os.environ["NEO4J_PASSWORD"]))
    return drv

def capture_plan_hash(tx, query, params=None):
    q = "CYPHER planner=cost EXPLAIN " + query
    plan = tx.run(q, params or {}).consume().plan
    # normalize plan tree
    def flatten(p):
        d = f"{p.operator_type}|{sorted((p.identifiers or {}).keys())}|{sorted((p.arguments or {}).keys())}"
        for c in (p.children or []): d += "|" + flatten(c)
        return d
    return h(flatten(plan))

def profile_latency(tx, query, params=None):
    t0 = time.perf_counter()
    _ = tx.run("CYPHER planner=cost PROFILE " + query, params or {}).data()
    return (time.perf_counter() - t0) * 1000

def graph_only_query():
    # Removed invalid USING INDEX hints without predicates
    return """
    MATCH (a:IntelEntity)-[r:RELATED]->(b:IntelEntity)
    WITH a,b,r ORDER BY r.w DESC LIMIT $lim
    RETURN a.name AS a, b.name AS b, r.w AS w
    """

def hybrid_query():
    return """
    MATCH (a:IntelEntity)-[r:RELATED]->(b:IntelEntity)
    WHERE a.id IN $ids OR b.id IN $ids
    WITH a,b,r ORDER BY r.w DESC LIMIT $lim
    RETURN a.name AS a, b.name AS b, r.w AS w
    """

def build_faiss(emb, nodes):
    dim = emb.get_sentence_embedding_dimension()
    index = faiss.IndexFlatL2(dim)
    X = emb.encode(nodes, convert_to_numpy=True, normalize_embeddings=True, batch_size=256)
    index.add(X)
    return index, X

def precision_at_k(res, gold, k):
    # Interleave nodes from top edges to evaluate both sides of relationships
    pred = []
    for r in res:
        pred.extend([r["a"], r["b"]])

    got = [x for x in pred[:k] if x in set(gold)]
    return len(got)/min(k, len(set(gold)))

def main():
    runs = int(os.getenv("RUNS","10")); k = int(os.getenv("TOP_K","5"))
    emb = SentenceTransformer(os.getenv("EMBEDDING_MODEL"))
    nodes = [f"E{i}" for i in range(1,1001)]
    faiss_index, _ = build_faiss(emb, nodes)

    base_dir = os.path.dirname(__file__)
    claims_path = os.path.join(base_dir, "claims.jsonl")
    results_path = os.path.join(base_dir, "results.json")

    claims = [json.loads(l) for l in open(claims_path)]
    out = {"runs":runs,"k":k,"seed":SEED,"metrics":[]}

    with neo() as driver, driver.session(database=os.getenv("GRAPH_DB","neo4j")) as sess:
        for _ in tqdm(range(runs)):
            for c in claims:
                # 1. Graph-only
                go_q = graph_only_query()
                go_params = {"lim": 50}

                def run_go(tx):
                    h_val = capture_plan_hash(tx, go_q, go_params)
                    t_val = profile_latency(tx, go_q, go_params)
                    res = tx.run(go_q, go_params).data()
                    p_val = precision_at_k(res, c["gold"], k)
                    return h_val, t_val, p_val

                go_h, go_t, go_p = sess.execute_write(run_go)

                # 2. Hybrid
                # Move embedding outside transaction to avoid holding locks during inference
                vec = emb.encode([c["text"]], convert_to_numpy=True, normalize_embeddings=True)[0]
                D, I = faiss_index.search(vec.reshape(1,-1), 64)
                ids = [int(nodes[i].split('E')[-1]) for i in I[0]]

                hy_q = hybrid_query()
                hy_params = {"ids": ids, "lim": 50}

                def run_hybrid(tx):
                    h_val = capture_plan_hash(tx, hy_q, hy_params)
                    t_val = profile_latency(tx, hy_q, hy_params)
                    res = tx.run(hy_q, hy_params).data()
                    p_val = precision_at_k(res, c["gold"], k)
                    return h_val, t_val, p_val

                hy_h, hy_t, hy_p = sess.execute_write(run_hybrid)

                out["metrics"].append({"claim_id":c["claim_id"],
                                       "graph_only":{"plan":go_h,"lat_ms":go_t,"p@k":go_p},
                                       "hybrid":{"plan":hy_h,"lat_ms":hy_t,"p@k":hy_p}})

    # summarize
    df = pd.DataFrame([{
        "go_p":m["graph_only"]["p@k"], "hy_p":m["hybrid"]["p@k"],
        "go_plan":m["graph_only"]["plan"], "hy_plan":m["hybrid"]["plan"],
        "go_lat":m["graph_only"]["lat_ms"], "hy_lat":m["hybrid"]["lat_ms"],
    } for m in out["metrics"]])

    def plan_consistency(col):
        if df.empty or col not in df: return 0.0
        counts = df[col].value_counts()
        if counts.empty: return 0.0
        return (counts.iloc[0] / len(df))*100

    summary = {
      "precision@k":{
        "graph_only": float(df["go_p"].mean()) if not df.empty else 0.0,
        "hybrid": float(df["hy_p"].mean()) if not df.empty else 0.0
      },
      "grounding_accuracy":{
        "graph_only": float((df["go_p"]==1.0).mean()) if not df.empty else 0.0,
        "hybrid": float((df["hy_p"]==1.0).mean()) if not df.empty else 0.0
      },
      "plan_consistency":{
        "graph_only_pct": plan_consistency("go_plan"),
        "hybrid_pct": plan_consistency("hy_plan")
      },
      "plan_entropy":{
        "graph_only_bits": float(-(df["go_plan"].value_counts(normalize=True)*np.log2(df["go_plan"].value_counts(normalize=True))).sum()) if not df.empty and "go_plan" in df else 0.0,
        "hybrid_bits": float(-(df["hy_plan"].value_counts(normalize=True)*np.log2(df["hy_plan"].value_counts(normalize=True))).sum()) if not df.empty and "hy_plan" in df else 0.0,
      },
      "latency_ms":{
        "graph_only":{"p50": float(df["go_lat"].median()) if not df.empty else 0.0, "p95": float(df["go_lat"].quantile(0.95)) if not df.empty else 0.0},
        "hybrid":{"p50": float(df["hy_lat"].median()) if not df.empty else 0.0, "p95": float(df["hy_lat"].quantile(0.95)) if not df.empty else 0.0}
      }
    }
    with open(results_path,"wb") as f: f.write(orjson.dumps({"summary":summary,"seed":SEED}))
    print(orjson.dumps({"summary":summary,"seed":SEED}).decode())

if __name__ == "__main__":
    main()
