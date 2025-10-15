import pathlib
import sys
from types import SimpleNamespace

MODULE_DIR = pathlib.Path(__file__).resolve().parents[1]
if str(MODULE_DIR) not in sys.path:
    sys.path.append(str(MODULE_DIR))

import model_integration_service as mis  # noqa: E402


def test_sentiment_model_service_uses_requested_framework(monkeypatch):
    captured_kwargs = {}

    def fake_pipeline_factory(**kwargs):
        captured_kwargs.update(kwargs)

        def _runner(texts):
            return [{"label": "POSITIVE", "score": 0.9} for _ in texts]

        return _runner

    fake_torch = SimpleNamespace(cuda=SimpleNamespace(is_available=lambda: False))
    monkeypatch.setattr(mis, "torch", fake_torch, raising=False)
    monkeypatch.setattr(mis, "tf", None, raising=False)

    settings = mis.Settings()
    service = mis.SentimentModelService(settings, pipeline_factory=fake_pipeline_factory)
    service.load(model_name="distilroberta", framework="torch")

    predictions = service.predict(["IntelGraph ML Engine"])

    assert captured_kwargs["model"] == "distilroberta"
    assert captured_kwargs["framework"] == "pt"
    assert predictions[0].framework == "torch"
    assert predictions[0].label == "POSITIVE"


def test_ingest_wizard_bridge_runs_job(monkeypatch):
    class DummyIngestor:
        def fetch_records(self, job_id, limit):
            return [{"source_id": "123", "text": "Summit ML"}]

    class DummyWriter:
        def __init__(self):
            self.last_job = None
            self.last_predictions = None

        def write(self, job_id, predictions):
            self.last_job = job_id
            self.last_predictions = predictions
            return "neo4j-batch-1"

    class DummyModel:
        def __init__(self):
            self.loaded = None

        def load(self, model_name=None, framework=None):
            self.loaded = (model_name, framework)

        def predict(self, texts, job_id=None):
            return [
                mis.SentimentPrediction(
                    text=texts[0],
                    label="POSITIVE",
                    score=0.95,
                    model_name="dummy",
                    framework="torch",
                    job_id=job_id,
                )
            ]

    bridge = mis.IngestWizardBridge(DummyIngestor(), DummyWriter(), DummyModel())
    response = bridge.run_job("job-xyz", model_name="hf-model", framework="torch")

    assert response.job_id == "job-xyz"
    assert response.processed_count == 1
    assert response.neo4j_batch_id == "neo4j-batch-1"
    assert response.predictions[0].source_id == "123"
    assert response.predictions[0].neo4j_node_id is not None


def test_postgres_ingestor_fetch_records(monkeypatch):
    class FakeCursor:
        def __init__(self):
            self.executed = None

        def execute(self, query, params):
            self.executed = (query, params)

        def fetchall(self):
            return [{"id": 7, "text": "IntelGraph rocks"}]

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    class FakeConnection:
        def __init__(self):
            self.cursor_instance = FakeCursor()

        def cursor(self):
            return self.cursor_instance

    fake_connection = FakeConnection()
    ingestor = mis.PostgresIngestor(mis.Settings(), connection_factory=lambda **_: fake_connection)

    records = ingestor.fetch_records("job-123", limit=5)

    assert records == [{"source_id": "7", "text": "IntelGraph rocks"}]
    assert fake_connection.cursor_instance.executed[1]["limit"] == 5
    assert fake_connection.cursor_instance.executed[1]["job_id"] == "job-123"
