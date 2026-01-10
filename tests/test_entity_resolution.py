import sys
from unittest.mock import MagicMock, patch

# Mock dependencies before import
mock_numpy = MagicMock()
sys.modules["numpy"] = mock_numpy
sys.modules["hdbscan"] = MagicMock()
sys.modules["redis"] = MagicMock()
sys.modules["sentence_transformers"] = MagicMock()
sys.modules["prometheus_client"] = MagicMock()

# Now import the class to test
from entity_resolution import EntityResolutionEngine


def test_entity_resolution_resolve():
    # Setup mocks
    mock_redis = MagicMock()
    mock_neo4j = MagicMock()

    # Mock SentenceTransformer
    mock_model = MagicMock()

    # Mock array creation
    # We need mock_numpy.array to return something that we can check?
    # Or just return a MagicMock
    mock_embeddings = MagicMock()
    mock_numpy.array.return_value = mock_embeddings

    # Mock model.encode to return a list (which np.array converts)
    mock_model.encode.return_value = [[0.1, 0.2], [0.1, 0.21]]

    # Mock HDBSCAN
    mock_clusterer = MagicMock()
    # Return labels: 0 for both (clustered together)
    # The code does: for entity, label in zip(entities, labels, strict=False):
    # So labels needs to be iterable.
    mock_clusterer.fit_predict.return_value = [0, 0]

    with patch("entity_resolution.SentenceTransformer", return_value=mock_model):
        with patch("hdbscan.HDBSCAN", return_value=mock_clusterer):
            engine = EntityResolutionEngine(redis_client=mock_redis, neo4j_client=mock_neo4j)

            entities = [
                {"id": "e1", "name": "Acme Corp", "metadata": {"type": "org"}},
                {"id": "e2", "name": "Acme Corporation", "metadata": {"type": "org"}},
            ]

            mapping = engine.resolve(entities)

            # Verification
            assert mapping["e1"] == mapping["e2"]
            assert mapping["e1"].startswith("canonical_")

            # Verify Redis set called
            assert mock_redis.set.call_count == 2

            # Verify Neo4j update called
            assert mock_neo4j.create_or_update_entity.call_count == 2


def test_entity_resolution_no_cluster():
    # Setup mocks
    mock_redis = MagicMock()

    mock_model = MagicMock()
    mock_numpy.array.return_value = MagicMock()

    mock_clusterer = MagicMock()
    # Labels: -1 means noise (not clustered)
    mock_clusterer.fit_predict.return_value = [-1, -1]

    with patch("entity_resolution.SentenceTransformer", return_value=mock_model):
        with patch("hdbscan.HDBSCAN", return_value=mock_clusterer):
            engine = EntityResolutionEngine(redis_client=mock_redis)

            entities = [
                {"id": "e1", "name": "Acme Corp", "metadata": {}},
                {"id": "e2", "name": "Beta Inc", "metadata": {}},
            ]

            mapping = engine.resolve(entities)

            # e1 -> e1, e2 -> e2 because label is -1
            assert mapping["e1"] == "e1"
            assert mapping["e2"] == "e2"
