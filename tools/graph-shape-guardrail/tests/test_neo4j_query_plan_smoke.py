from unittest.mock import MagicMock
from graph_shape_guardrail.neo4j_client import Neo4jClient

def test_neo4j_client_query_construction():
    mock_driver = MagicMock()
    mock_session = mock_driver.session.return_value

    client = Neo4jClient(mock_driver)
    # This call will iterate over the generator, which triggers the session.run
    list(client.stream_degrees_map("my_graph", ["User"], ["FOLLOWS"], stable_key="uid"))

    # Verify session.run was called
    assert mock_session.run.called
    args, kwargs = mock_session.run.call_args
    assert "gds.degree.stream" in args[0]

    params = args[1]
    assert params['graph_name'] == "my_graph"
    assert params['node_labels'] == ["User"]
    assert params['relationship_types'] == ["FOLLOWS"]
    assert params['stable_key'] == "uid"
