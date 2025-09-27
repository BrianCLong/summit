import os
import sys
import types

import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import entity_resolution as er


class DummyRedis(dict):
    def set(self, k, v):
        super().__setitem__(k, v)

    def get(self, k):
        return super().get(k)


class DummyNeo4j:
    def __init__(self):
        self.entities = []

    def create_or_update_entity(self, label, props):
        self.entities.append(props)


class DummyModel:
    def encode(self, texts):
        return np.array([[0], [0], [1]])


class DummyClusterer:
    def fit_predict(self, embeddings):
        return np.array([0, 0, 1])


def test_entity_resolution_groups_similar_entities(monkeypatch):
    monkeypatch.setattr(er, "SentenceTransformer", lambda name: DummyModel())
    monkeypatch.setattr(
        er, "hdbscan", types.SimpleNamespace(HDBSCAN=lambda min_cluster_size: DummyClusterer())
    )
    engine = er.EntityResolutionEngine(
        redis_client=DummyRedis(), neo4j_client=DummyNeo4j(), model_name="dummy"
    )
    entities = [
        {"id": "1", "name": "Alice"},
        {"id": "2", "name": "Alicia"},
        {"id": "3", "name": "Bob"},
    ]
    mapping = engine.resolve(entities)
    assert mapping["1"] == mapping["2"]
    assert mapping["3"] != mapping["1"]
