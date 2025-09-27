import importlib
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))


def create_app() -> TestClient:
    from app.main import app

    return TestClient(app)


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_RPS", "2")
    import app.config as cfg

    importlib.reload(cfg)
    import app.security as sec

    importlib.reload(sec)
    return create_app()
