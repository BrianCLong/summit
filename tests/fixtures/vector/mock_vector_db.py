import numpy as np
from typing import List, Dict, Any, Optional

class MockVectorDB:
    def __init__(self):
        self.storage = {}
        self.metadata = {}
        self.index_built = False

    def upsert(self, ids: List[str], vectors: List[List[float]], metadatas: List[Dict[str, Any]]):
        for idx, vec, meta in zip(ids, vectors, metadatas):
            self.storage[idx] = np.array(vec)
            self.metadata[idx] = meta

    def query(self, vector: List[float], top_k: int, filter_metadata: Optional[Dict[str, Any]] = None, metric: str = "cosine"):
        if not self.index_built:
            raise ValueError("Index not built")

        query_vec = np.array(vector)
        results = []
        for idx, vec in self.storage.items():
            if filter_metadata:
                match = all(self.metadata[idx].get(k) == v for k, v in filter_metadata.items())
                if not match:
                    continue

            if metric == "cosine":
                norm_q = np.linalg.norm(query_vec)
                norm_v = np.linalg.norm(vec)
                score = np.dot(query_vec, vec) / (norm_q * norm_v) if norm_q and norm_v else 0
            elif metric == "dot":
                score = np.dot(query_vec, vec)
            else:
                raise ValueError(f"Unknown metric {metric}")

            results.append({"id": idx, "score": float(score), "metadata": self.metadata[idx]})

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    def build_index(self):
        self.index_built = True

    def rebuild_index(self):
        self.index_built = True

class VectorStoreIntegration:
    """Summit vector store integration layer mock."""
    def __init__(self, db: MockVectorDB):
        self.db = db
        self.embedding_cache = {}

    def generate_embedding(self, text: str) -> List[float]:
        if text in self.embedding_cache:
            return self.embedding_cache[text]
        # Dummy embedding generation (deterministic for tests)
        np.random.seed(abs(hash(text)) % (2**32))
        embedding = np.random.rand(128).tolist()
        self.embedding_cache[text] = embedding
        return embedding

    def store_document(self, doc_id: str, text: str, metadata: Dict[str, Any]):
        vector = self.generate_embedding(text)
        self.db.upsert([doc_id], [vector], [metadata])

    def batch_upsert(self, documents: List[Dict[str, Any]]):
        ids = []
        vectors = []
        metadatas = []
        for doc in documents:
            ids.append(doc["id"])
            vectors.append(self.generate_embedding(doc["text"]))
            metadatas.append(doc.get("metadata", {}))
        self.db.upsert(ids, vectors, metadatas)

    def similarity_search(self, query: str, top_k: int = 5, filters: Optional[Dict[str, Any]] = None, metric: str = "cosine"):
        vector = self.generate_embedding(query)
        return self.db.query(vector, top_k, filter_metadata=filters, metric=metric)

    def hybrid_search(self, query: str, graph_nodes: List[str], top_k: int = 5, metric: str = "cosine"):
        # Combine vector similarity with graph traversal
        vector = self.generate_embedding(query)
        # Fetch more to allow graph boost to re-rank
        results = self.db.query(vector, top_k * 2, metric=metric)

        # Boost scores if in graph_nodes
        for res in results:
            if res["id"] in graph_nodes:
                res["score"] *= 1.5

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    def build_index(self):
        self.db.build_index()

    def rebuild_index(self):
        self.db.rebuild_index()

    def invalidate_cache(self, text: str):
        if text in self.embedding_cache:
            del self.embedding_cache[text]
