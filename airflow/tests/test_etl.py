import pytest
from airflow.etl.connectors.mock_source import MockSourceConnector
from airflow.etl.transformers.validation import validate_record
from airflow.etl.loaders.neo4j_loader import Neo4jLoader
from unittest.mock import MagicMock, patch

def test_mock_source_connector():
    connector = MockSourceConnector(source_name="test_source")
    data = list(connector.fetch_data(limit=10))
    assert len(data) == 10
    assert data[0]['source'] == "test_source"
    assert "id" in data[0]
    assert "content" in data[0]

def test_validation_valid_record():
    valid_record = {
        "id": "123",
        "source": "twitter",
        "timestamp": "2023-10-27T10:00:00",
        "author": "user1",
        "content": "This is a tweet",
        "metadata": {"likes": 10}
    }
    model = validate_record(valid_record)
    assert model is not None
    assert model.id == "123"

def test_validation_invalid_record():
    invalid_record = {
        "id": "123",
        # Missing source
        "timestamp": "2023-10-27T10:00:00",
        "author": "user1",
        "content": "This is a tweet"
    }
    model = validate_record(invalid_record)
    assert model is None

def test_validation_empty_content():
    invalid_record = {
        "id": "123",
        "source": "twitter",
        "timestamp": "2023-10-27T10:00:00",
        "author": "user1",
        "content": "   " # Empty string
    }
    model = validate_record(invalid_record)
    assert model is None

@patch('airflow.etl.loaders.neo4j_loader.GraphDatabase')
def test_neo4j_loader(mock_graph_db):
    mock_driver = MagicMock()
    mock_session = MagicMock()
    mock_graph_db.driver.return_value = mock_driver
    mock_driver.session.return_value.__enter__.return_value = mock_session

    loader = Neo4jLoader()
    records = [{"id": "1", "author": "a", "content": "c", "timestamp": "t", "source": "s"}]

    loader.load_batch(records)

    mock_graph_db.driver.assert_called_once()
    mock_driver.session.assert_called_once()
    mock_session.execute_write.assert_called_once()
