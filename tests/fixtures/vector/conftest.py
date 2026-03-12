import pytest
from .mock_vector_db import MockVectorDB, VectorStoreIntegration

@pytest.fixture
def mock_db():
    return MockVectorDB()

@pytest.fixture
def vector_store(mock_db):
    store = VectorStoreIntegration(mock_db)
    store.build_index()
    return store
