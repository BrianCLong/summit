import json
import pathlib

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

SEED = 1337
N_RUNS = 100
TOPK = 5
IDX_DIR = pathlib.Path("artifacts/graphrag/index")
IDS = (IDX_DIR / "ids.txt").read_text().splitlines()
INDEX = faiss.read_index(str(IDX_DIR / "hnsw_ip.faiss"))
MODEL = SentenceTransformer("all-MiniLM-L6-v2")

# Fixed seed queries (stable prompts; tune to your domain)
QUERIES = [
  "How does Summit enforce governance on golden main?",
  "What is GraphRAG and how does it use the graph?",
  "How do merge trains improve CI throughput?",
  "Where are entities and relations stored with provenance?",
  "What role do SBOMs and SLSA play in releases?"
]

def encode(qs):
  embs = MODEL.encode(qs, batch_size=16, show_progress_bar=False, normalize_embeddings=True)
  return embs.astype(np.float32)

GOLD = None

def search(embs, topk):
  sims, idx = INDEX.search(embs, topk)
  return [[IDS[i] for i in row] for row in idx]

def test_topk_reproducibility(tmp_path=None):
  global GOLD
  q_embs = encode(QUERIES)
  # Establish gold once
  if GOLD is None:
    GOLD = search(q_embs, TOPK)

  for run in range(N_RUNS):
    results = search(q_embs, TOPK)
    assert results == GOLD, f"Run {run}: non-deterministic results!\nGot {results}\nExp {GOLD}"
