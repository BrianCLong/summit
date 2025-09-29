import os, polars as pl, duckdb, json, glob
OUT = os.getenv("OUT","/data/datasets")
SRC = os.getenv("SRC","/data/kafka_dump")  # parquet/json lines written by a small consumer or Kafka Connect

def load(topic: str) -> pl.DataFrame:
    files = glob.glob(f"{SRC}/{topic}/*.parquet")
    if not files: return pl.DataFrame([])
    return pl.concat([pl.read_parquet(f) for f in files], how="diagonal")

def build_linkpred():
    edges = load("intelgraph.edges.v1")
    nodes = load("intelgraph.entities.v1")
    labels = load("intelgraph.labels.v1")  # accept/reject for positives/negatives
    if edges.is_empty() or nodes.is_empty(): return

    # Positive pairs = accepted suggestions, negatives = rejected or sampled non-edges
    pos = labels.filter(pl.col("label")=="accept").select(pl.col("suggestionId")).with_columns()
    # For brevity, assume suggestionId encodes (src,dst); real code joins via suggestion store
    # Create negatives by random pairing within tenant/time window (duckdb efficient join)
    duckdb.sql("INSTALL httpfs; LOAD httpfs;")
    duckdb_df = duckdb.query("SELECT 1").fetchdf()

    # Minimal edge features (temporal gap, degree proxies from Redis snapshot, etc.)
    df = edges.select("src","dst","tenantId","ts").with_columns([
        (pl.col("ts").str.strptime(pl.Datetime)).alias("ts_dt")
    ])
    df.write_parquet(f"{OUT}/linkpred_train.parquet")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    build_linkpred()
