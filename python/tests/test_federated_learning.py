import asyncio
import importlib
import json
import sys
from pathlib import Path
import types

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from intelgraph_py.ml.federated import (
    FederatedLearningEngine,
    FederatedTrainingConfig,
    gaussian_dp_epsilon,
)


class _FakeAlgorithm:
    def __init__(self):
        self._round = 0

    def initialize(self):
        return {"weights": 0}

    def next(self, state, sampled_clients):
        self._round += 1
        metrics = {"train": {"loss": 1.0 / self._round, "accuracy": 0.5 + 0.05 * self._round}}
        metrics["round"] = self._round
        return {"weights": state["weights"] + len(sampled_clients)}, metrics


def test_federated_engine_runs_with_stub_algorithm():
    config = FederatedTrainingConfig(rounds=3, clients_per_round=2, noise_multiplier=1.3, delta=1e-5)
    engine = FederatedLearningEngine(
        model_fn=lambda: None,
        config=config,
        algorithm_builder=lambda: _FakeAlgorithm(),
        random_seed=42,
    )

    client_data = [[{"features": [0.1], "label": 0}], [{"features": [0.2], "label": 1}], [{"features": [0.3], "label": 0}]]
    result = engine.run(client_data)

    assert result.rounds_completed == 3
    assert len(result.metrics) == 3
    assert result.metrics[-1]["round"] == 3
    expected_epsilon = gaussian_dp_epsilon(config.noise_multiplier, config.rounds, config.delta)
    assert pytest.approx(result.privacy["epsilon"], rel=1e-6) == expected_epsilon


def test_run_federated_training_job_handles_missing_dependencies(monkeypatch, tmp_path):
    db_path = tmp_path / "jobs.sqlite"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")

    db_module = importlib.reload(importlib.import_module("intelgraph_py.database"))
    models_module = importlib.reload(importlib.import_module("intelgraph_py.models"))

    engine = db_module.get_engine()
    db_module.create_db_tables(engine)
    SessionLocal = db_module.get_session_local(engine)

    dummy_session = types.SimpleNamespace(
        __enter__=lambda self: self,
        __exit__=lambda self, exc_type, exc, tb: False,
        run=lambda *args, **kwargs: None,
    )
    dummy_driver = types.SimpleNamespace(
        session=lambda: dummy_session,
        close=lambda: None,
    )
    dummy_graph_db = types.SimpleNamespace(driver=lambda *args, **kwargs: dummy_driver)
    monkeypatch.setitem(sys.modules, "neo4j", types.SimpleNamespace(GraphDatabase=dummy_graph_db))
    monkeypatch.setitem(sys.modules, "pandas", types.SimpleNamespace(__all__=[]))
    monkeypatch.setitem(sys.modules, "pyarrow", types.SimpleNamespace(__all__=[], __spec__=None))
    monkeypatch.setitem(sys.modules, "pyarrow.lib", types.SimpleNamespace())

    tasks_module = importlib.import_module("intelgraph_py.tasks")
    tasks_module.get_db = db_module.get_db
    tasks_module.FederatedTrainingJob = models_module.FederatedTrainingJob
    run_federated_training_job = tasks_module.run_federated_training_job

    session = SessionLocal()
    job = models_module.FederatedTrainingJob(
        job_name="demo",
        status="PENDING",
        config={
            "training": {"rounds": 1},
            "clients": [
                {
                    "client_id": "client-1",
                    "records": [{"features": [0.1, 0.2], "label": 1}],
                }
            ],
        },
    )
    session.add(job)
    session.commit()
    job_id = job.id
    session.close()

    monkeypatch.setattr(
        "intelgraph_py.tasks.FederatedLearningEngine.is_supported",
        lambda: False,
    )

    run_federated_training_job.run(job_id)

    session = SessionLocal()
    refreshed = session.query(models_module.FederatedTrainingJob).get(job_id)
    assert refreshed.status == "FAILED"
    assert "TensorFlow Federated" in (refreshed.error or "")
    session.close()


def test_start_federated_training_job_mutation_persists_job(monkeypatch, tmp_path):
    db_path = tmp_path / "graphql.sqlite"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")

    db_module = importlib.reload(importlib.import_module("intelgraph_py.database"))
    models_module = importlib.reload(importlib.import_module("intelgraph_py.models"))
    engine = db_module.get_engine()
    db_module.create_db_tables(engine)
    SessionLocal = db_module.get_session_local(engine)

    openai_stub = types.ModuleType("openai")
    openai_stub.__spec__ = importlib.machinery.ModuleSpec("openai", loader=None)
    monkeypatch.setitem(sys.modules, "openai", openai_stub)

    ml_stub = types.ModuleType("ml")
    ml_stub.__spec__ = importlib.machinery.ModuleSpec("ml", loader=None, is_package=True)
    ml_stub.__path__ = []  # type: ignore[attr-defined]
    app_stub = types.ModuleType("ml.app")
    app_stub.__spec__ = importlib.machinery.ModuleSpec("ml.app", loader=None, is_package=True)
    app_stub.__path__ = []  # type: ignore[attr-defined]
    link_stub = types.ModuleType("ml.app.link_prediction")
    link_stub.__spec__ = importlib.machinery.ModuleSpec("ml.app.link_prediction", loader=None)
    link_stub.LinkPredictor = object
    link_stub.TransformerEmbedding = object
    monkeypatch.setitem(sys.modules, "ml", ml_stub)
    monkeypatch.setitem(sys.modules, "ml.app", app_stub)
    monkeypatch.setitem(sys.modules, "ml.app.link_prediction", link_stub)
    gql = importlib.reload(importlib.import_module("intelgraph_py.graphql_schema"))

    captured = {}

    def fake_delay(job_id):
        captured["job_id"] = job_id

        class _Result:
            id = "fake-task"

        return _Result()

    monkeypatch.setattr(gql.run_federated_training_job, "delay", fake_delay)

    dataset_path = tmp_path / "client.json"
    dataset_path.write_text(json.dumps([{"features": [0.1, 0.2], "label": 1}]))

    mutation = """
    mutation Start($config: FederatedTrainingConfigInput!, $clients: [FederatedClientInput!]!) {
      startFederatedTrainingJob(jobName: \"demo\", config: $config, clients: $clients) {
        id
        status
        jobName
      }
    }
    """

    variables = {
        "config": {
            "rounds": 2,
            "clientsPerRound": 1,
            "batchSize": 4,
            "clientLearningRate": 0.1,
            "serverLearningRate": 1.0,
            "noiseMultiplier": 1.5,
            "clippingNorm": 1.0,
            "delta": 1e-5,
            "targetAccuracy": None,
        },
        "clients": [
            {
                "clientId": "client-1",
                "path": str(dataset_path),
                "records": [],
            }
        ],
    }

    result = asyncio.run(gql.schema.execute(mutation, variable_values=variables))

    assert result.errors is None
    payload = result.data["startFederatedTrainingJob"]
    assert payload["status"] == "PENDING"
    job_id = int(payload["id"])
    assert captured["job_id"] == job_id

    session = SessionLocal()
    stored = session.query(models_module.FederatedTrainingJob).get(job_id)
    assert stored is not None
    assert stored.config["training"]["rounds"] == 2
    session.close()
