"""Tests for AutoML entity recognition pipeline."""

from __future__ import annotations

from pathlib import Path
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.training.automl import AutoMLJobConfig, EntityAutoMLTrainer
from app.monitoring.metrics import automl_jobs_total, automl_best_score


class FakeTx:
    def __init__(self, recorder):
        self.recorder = recorder

    def run(self, query, params):
        self.recorder["query"] = query
        self.recorder["params"] = params


class FakeSession:
    def __init__(self, recorder):
        self.recorder = recorder

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute_write(self, func):
        func(FakeTx(self.recorder))

    def close(self):
        return None


class FakeDriver:
    def __init__(self):
        self.recorder = {}

    def session(self):
        return FakeSession(self.recorder)


@pytest.fixture
def labelled_examples():
    texts = [
        "IntelGraph partners with Summit Analytics to expand research.",
        "Summit Analytics launches new data governance services.",
        "Neo4j powers the IntelGraph knowledge graph deployment.",
        "Summit Analytics and IntelGraph collaborate on AutoML projects.",
        "Neo4j graph database scales entity recognition workloads.",
        "IntelGraph showcases Summit Analytics platform at conference.",
        "Summit Analytics debuts managed analytics services for customers.",
        "IntelGraph and Summit Analytics sign global partnership agreement.",
        "Neo4j enables high fidelity knowledge graph inference for IntelGraph.",
        "Summit Analytics introduces enterprise onboarding service program.",
    ]
    labels = [
        "PARTNERSHIP",
        "SERVICE",
        "TECH",
        "PARTNERSHIP",
        "TECH",
        "PARTNERSHIP",
        "SERVICE",
        "PARTNERSHIP",
        "TECH",
        "SERVICE",
    ]
    return texts, labels


def test_entity_automl_records_metrics_and_persists(labelled_examples):
    texts, labels = labelled_examples
    driver = FakeDriver()
    trainer = EntityAutoMLTrainer(driver=driver)

    counter = automl_jobs_total.labels(
        task=trainer.TASK_NAME,
        backend="sklearn",
        status="completed",
    )
    before = counter._value.get()

    result = trainer.run_job(
        texts,
        labels,
        config=AutoMLJobConfig(backend_preference="sklearn", max_runtime_seconds=30),
        job_id="automl-test",
    )

    after = counter._value.get()
    assert after == before + 1

    gauge = automl_best_score.labels(task=trainer.TASK_NAME, metric="f1")
    assert gauge._value.get() >= 0

    assert result.job_id == "automl-test"
    assert result.backend == "sklearn"
    assert result.best_model
    assert result.metrics["f1"] >= 0

    assert driver.recorder["query"].startswith("MERGE (j:AutoMLJob")
    params = driver.recorder["params"]
    assert params["job_id"] == "automl-test"
    assert params["metrics"]["f1"] == pytest.approx(result.metrics["f1"])


def test_entity_automl_validates_input(labelled_examples):
    texts, labels = labelled_examples
    trainer = EntityAutoMLTrainer(driver=None)

    with pytest.raises(ValueError):
        trainer.run_job(texts, labels[:-1])

    with pytest.raises(ValueError):
        trainer.run_job([], [])
