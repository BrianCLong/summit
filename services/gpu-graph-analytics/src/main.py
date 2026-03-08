import os
import uuid
from typing import Optional

import cudf
import cugraph
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="GPU Graph Analytics Service")

def build_graph_from_parquet(path: str, directed: bool = False) -> cugraph.Graph:
    """Builds a cugraph Graph from a parquet file."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Parquet file not found: {path}")
    df = cudf.read_parquet(path)
    G = cugraph.Graph(directed=directed)
    G.from_cudf_edgelist(df, source='src', destination='dst', edge_attr=None)
    return G

def run_pagerank(edgelist_path: str, alpha: float = 0.85, tol: float = 1e-6, max_iter: int = 100):
    """Runs PageRank on the given graph."""
    G = build_graph_from_parquet(edgelist_path, directed=True)
    df_pr = cugraph.pagerank(G, alpha=alpha, tol=tol, max_iter=max_iter)
    return df_pr

def run_louvain(edgelist_path: str):
    """Runs Louvain community detection on the given graph."""
    G = build_graph_from_parquet(edgelist_path, directed=False)
    parts, modularity = cugraph.louvain(G)
    return parts, modularity

def run_bfs(edgelist_path: str, start_vertex: int, depth_limit: Optional[int] = None):
    """Runs BFS from a start vertex up to a depth limit."""
    G = build_graph_from_parquet(edgelist_path, directed=True)
    df_bfs = cugraph.bfs(G, start=start_vertex, depth_limit=depth_limit)
    return df_bfs

# Request Models
class PageRankRequest(BaseModel):
    edgelist_uri: str
    alpha: float = 0.85
    tol: float = 1e-6
    max_iter: int = 100
    results_uri: Optional[str] = None

class LouvainRequest(BaseModel):
    edgelist_uri: str
    results_uri: Optional[str] = None

class BFSRequest(BaseModel):
    edgelist_uri: str
    start_vertex: int
    depth_limit: Optional[int] = None
    results_uri: Optional[str] = None

# API Endpoints
@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/jobs/pagerank")
def create_pagerank_job(req: PageRankRequest):
    try:
        # For MVP, this blocks. In production, use background task/queue
        df_pr = run_pagerank(req.edgelist_uri, req.alpha, req.tol, req.max_iter)

        # Save results if URI provided, else return snippet
        job_id = str(uuid.uuid4())
        out_uri = req.results_uri or f"/tmp/pagerank_{job_id}.parquet"
        df_pr.to_parquet(out_uri)

        return {
            "job_id": job_id,
            "status": "completed",
            "results_uri": out_uri,
            "vertices_scored": len(df_pr)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/jobs/louvain")
def create_louvain_job(req: LouvainRequest):
    try:
        parts, modularity = run_louvain(req.edgelist_uri)

        job_id = str(uuid.uuid4())
        out_uri = req.results_uri or f"/tmp/louvain_{job_id}.parquet"
        parts.to_parquet(out_uri)

        return {
            "job_id": job_id,
            "status": "completed",
            "results_uri": out_uri,
            "modularity": float(modularity),
            "vertices_partitioned": len(parts)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/jobs/bfs")
def create_bfs_job(req: BFSRequest):
    try:
        df_bfs = run_bfs(req.edgelist_uri, req.start_vertex, req.depth_limit)

        job_id = str(uuid.uuid4())
        out_uri = req.results_uri or f"/tmp/bfs_{job_id}.parquet"
        df_bfs.to_parquet(out_uri)

        return {
            "job_id": job_id,
            "status": "completed",
            "results_uri": out_uri,
            "vertices_visited": len(df_bfs)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
