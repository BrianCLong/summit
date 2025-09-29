from unittest.mock import MagicMock, patch

from intelgraph_py.storage.neo4j_store import Neo4jStore


@patch("intelgraph_py.storage.neo4j_store.GraphDatabase")
def test_delete_entity(mock_graph):
    mock_driver = MagicMock()
    mock_graph.driver.return_value = mock_driver
    store = Neo4jStore("bolt://x", "u", "p")
    store._run = MagicMock()
    store.delete_entity("123")
    store._run.assert_called_once_with(
        "MATCH (n:Entity {id: $id}) DETACH DELETE n",
        {"id": "123"},
    )


@patch("intelgraph_py.storage.neo4j_store.GraphDatabase")
def test_delete_relationship(mock_graph):
    mock_driver = MagicMock()
    mock_graph.driver.return_value = mock_driver
    store = Neo4jStore("bolt://x", "u", "p")
    store._run = MagicMock()
    store.delete_relationship("a", "b", "KNOWS")
    store._run.assert_called_once_with(
        "MATCH (a:Entity {id: $src})-[r:REL {kind: $kind}]->(b:Entity {id: $dst}) DELETE r",
        {"src": "a", "dst": "b", "kind": "KNOWS"},
    )
