import pytest
from fastapi.testclient import TestClient

from summit.main import app


@pytest.fixture
def client():
    return TestClient(app)
