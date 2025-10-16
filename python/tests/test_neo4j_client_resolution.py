import os
import sys
import types

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from intelgraph_neo4j_client import IntelGraphNeo4jClient


class DummySession:
    def __init__(self, recorder):
        self.recorder = recorder

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def write_transaction(self, func):
        class Tx:
            def __init__(self, recorder):
                self.recorder = recorder

            def run(self, query, canonical_id, properties):
                self.recorder["query"] = query
                self.recorder["properties"] = properties
                node = types.SimpleNamespace(_properties=properties)
                return types.SimpleNamespace(single=lambda: {"e": node})

        return func(Tx(self.recorder))


class DummyDriver:
    def __init__(self, recorder):
        self.recorder = recorder

    def session(self):
        return DummySession(self.recorder)


def test_neo4j_client_uses_canonical_id(monkeypatch):
    recorder = {}
    monkeypatch.setattr(IntelGraphNeo4jClient, "_initialize_driver", lambda self: None)
    client = IntelGraphNeo4jClient(
        {"neo4j_uri": "", "neo4j_username": "", "neo4j_password": ""}, redis_client=None
    )
    client.driver = DummyDriver(recorder)
    client.redis = types.SimpleNamespace(get=lambda k: "canon")
    props = {"id": "abc", "name": "Alice"}
    client.create_or_update_entity("Person", props)
    assert recorder["properties"]["canonical_id"] == "canon"
    assert "MERGE (e:Entity {canonical_id: $canonical_id})" in recorder["query"]
