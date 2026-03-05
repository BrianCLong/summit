#!/usr/bin/env python3
import json
import os
import pathlib
import random

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

SEED = 1337
random.seed(SEED); np.random.seed(SEED)
CORPUS = pathlib.Path("artifacts/graphrag/corpus.jsonl")
IDX_DIR = pathlib.Path("artifacts/graphrag/index")
IDX_DIR.mkdir(parents=True, exist_ok=True)

MODEL_NAME = os.environ.get("EMB_MODEL", "all-MiniLM-L6-v2")  # swap to your pinned model
model = SentenceTransformer(MODEL_NAME)  # version-pin in requirements

def load_texts():
    ids, texts = [], []
    with open(CORPUS, encoding="utf-8") as f:
        for line in f:
            obj = json.loads(line)
            ids.append(obj["id"])
            texts.append(obj["text"])
    return ids, texts

def main():
    ids, texts = load_texts()
    embs = model.encode(texts, batch_size=64, show_progress_bar=False, normalize_embeddings=True)
    d = embs.shape[1]

    # HNSW (inner product) with fixed params
    index = faiss.IndexHNSWFlat(d, 32, faiss.METRIC_INNER_PRODUCT)
    index.hnsw.efConstruction = 160
    faiss.omp_set_num_threads(1)

    index.add(embs.astype(np.float32))
    faiss.write_index(index, str(IDX_DIR / "hnsw_ip.faiss"))

    # Persist id mapping + build meta
    (IDX_DIR / "ids.txt").write_text("\n".join(ids))
    meta = {"seed": SEED, "model": MODEL_NAME, "index": "HNSWFlat-IP", "M": 32, "efConstruction": 160}
    (IDX_DIR / "build_meta.json").write_text(json.dumps(meta, indent=2))
    print("Index built deterministically.")

if __name__ == "__main__":
    main()
