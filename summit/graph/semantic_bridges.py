import math
from typing import Dict, List

from summit.embeddings.base import EmbeddingProvider
from summit.evidence.schema import generate_evidence_id


def cosine_similarity(v1, v2):
    dot_product = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a * a for a in v1))
    mag2 = math.sqrt(sum(a * a for a in v2))
    if mag1 == 0 or mag2 == 0: return 0.0
    return dot_product / (mag1 * mag2)
class SemanticBridgeEngine:
    def __init__(self, embedding_provider):
        self.embedding_provider = embedding_provider
    def find_bridges(self, notes, top_k=10):
        for note in notes:
            note["embedding"] = self.embedding_provider.embed_text(note["content"])
            note["evidence_id"] = generate_evidence_id(note["doc_id"], note["chunk_idx"])
        bridges = []
        for i in range(len(notes)):
            for j in range(i + 1, len(notes)):
                n1, n2 = notes[i], notes[j]
                if n1["doc_id"] == n2["doc_id"]: continue
                similarity = cosine_similarity(n1["embedding"], n2["embedding"])
                bridges.append({
                    "source_doc": n1["doc_id"], "target_doc": n2["doc_id"],
                    "source_evidence": n1["evidence_id"], "target_evidence": n2["evidence_id"],
                    "similarity_score": round(similarity, 4), "evidence_ids": [n1["evidence_id"], n2["evidence_id"]]
                })
        bridges.sort(key=lambda x: (-x["similarity_score"], x["source_doc"], x["target_doc"]))
        return bridges[:top_k]
