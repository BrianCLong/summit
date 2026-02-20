import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def client():
    from summit.main import app
    return TestClient(app)
