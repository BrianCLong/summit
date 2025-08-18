from __future__ import annotations
from typing import List, Dict, Any
import numpy as np
import redis
from sentence_transformers import SentenceTransformer
import hdbscan
from prometheus_client import Counter, Gauge


class EntityResolutionEngine:
    """Resolve similar entities into canonical IDs using embeddings and clustering."""

    def __init__(self, redis_client: redis.Redis, neo4j_client=None, model_name: str = "paraphrase-MiniLM-L6-v2"):
        self.redis = redis_client
        self.neo4j = neo4j_client
        self.model = SentenceTransformer(model_name)
        self.dedup_counter = Counter("deduplicated_entities_total", "Number of deduplicated entities")
        self.embedding_drift = Gauge("embedding_drift", "Embedding drift")
        self.feedback_delta = Gauge("feedback_loop_accuracy_delta", "Feedback loop accuracy delta")

    def _vectorize(self, entities: List[Dict[str, Any]]):
        texts = [self._combine(e) for e in entities]
        return np.array(self.model.encode(texts))

    def _combine(self, entity: Dict[str, Any]) -> str:
        metadata = " ".join(f"{k}:{v}" for k, v in entity.get("metadata", {}).items())
        return f"{entity['name']} {metadata}".strip()

    def resolve(self, entities: List[Dict[str, Any]]) -> Dict[str, str]:
        embeddings = self._vectorize(entities)
        clusterer = hdbscan.HDBSCAN(min_cluster_size=1)
        labels = clusterer.fit_predict(embeddings)
        mapping: Dict[str, str] = {}
        for entity, label in zip(entities, labels):
            canonical_id = f"canonical_{label}" if label != -1 else entity["id"]
            mapping[entity["id"]] = canonical_id
            self.redis.set(entity["id"], canonical_id)
            if self.neo4j:
                self.neo4j.create_or_update_entity("Entity", {"canonical_id": canonical_id, "name": entity["name"]})
        self.dedup_counter.inc(len(set(mapping.values())))
        return mapping
