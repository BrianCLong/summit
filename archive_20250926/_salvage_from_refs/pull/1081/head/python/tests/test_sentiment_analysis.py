import os
import pathlib
import sys
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parent.parent))

# Ensure in-memory DB and Celery eager for tests
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from intelgraph_py.main import app
from intelgraph_py.tasks import analyze_sentiment

client = TestClient(app)


def test_sentiment_endpoint_triggers_task(monkeypatch):
    mock_task = MagicMock()
    monkeypatch.setattr("intelgraph_py.tasks.analyze_sentiment.delay", lambda *a, **k: mock_task)
    mock_task.id = "task123"
    res = client.post(
        "/analyze/sentiment", json={"node_id": "1", "node_label": "Report", "text": "good"}
    )
    assert res.status_code == 200
    assert res.json()["task_id"] == "task123"
    assert mock_task.id == "task123"


def test_analyze_sentiment_task_updates_graph(monkeypatch):
    mock_pipeline = MagicMock(return_value=[{"label": "LABEL_2", "score": 0.95}])
    monkeypatch.setattr("intelgraph_py.tasks.get_sentiment_pipeline", lambda: mock_pipeline)

    class DummySession:
        def run(self, q, **p):
            self.q = q
            self.params = p

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            pass

    class DummyDriver:
        def session(self):
            return DummySession()

        def close(self):
            pass

    monkeypatch.setattr(
        "intelgraph_py.tasks.GraphDatabase", MagicMock(driver=lambda *a, **k: DummyDriver())
    )

    result = analyze_sentiment("42", "Great job", "Report")
    assert result["sentimentLabel"] == "positive"
    assert result["sentimentScore"] == 0.95
