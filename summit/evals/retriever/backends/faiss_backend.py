from typing import Any, List

try:
    import faiss
    import numpy as np
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False


class FAISSBackend:
    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        if FAISS_AVAILABLE:
            self.index = faiss.IndexFlatL2(dimension)
            self.doc_ids = []
        else:
            self.index = None
            self.doc_ids = []

    def is_available(self):
        return FAISS_AVAILABLE

    def add_vectors(self, vectors: Any, ids: List[str]):
        if not FAISS_AVAILABLE:
            raise RuntimeError("FAISS is not installed.")

        vectors_np = np.array(vectors).astype('float32')
        self.index.add(vectors_np)
        self.doc_ids.extend(ids)

    def search(self, queries: Any, k: int = 10):
        if not FAISS_AVAILABLE:
            raise RuntimeError("FAISS is not installed.")

        queries_np = np.array(queries).astype('float32')
        distances, indices = self.index.search(queries_np, k)

        results = []
        for i in range(len(queries)):
            item_results = []
            for idx in indices[i]:
                if idx != -1:
                    item_results.append(self.doc_ids[idx])
            results.append(item_results)
        return results
