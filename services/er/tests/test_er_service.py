"""Integration tests for the explainable entity-resolution service."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.pool import StaticPool

# Ensure the repository root is importable
ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.er import main
from services.er.classifier import PairwiseClassifier, load_training_pairs
from services.er.features import FeatureEngineer
from services.er.models import Entity, FeatureAttribution, MergeScorecard, Policy
from services.er.repository import DecisionRepository, MigrationManager, audit_log, merge_decisions

client = TestClient(main.app)
GOLDEN_PATH = Path("services/er/tests/golden.json")


@pytest.fixture(autouse=True)
def reset_state():
    main.ADJUDICATION_QUEUE.clear()
    main.EXPLANATIONS.clear()
    main.blocking_index.clear()
    with main.repository.engine.begin() as conn:
        conn.execute(merge_decisions.delete())
        conn.execute(audit_log.delete())
    yield
    main.ADJUDICATION_QUEUE.clear()
    main.EXPLANATIONS.clear()
    main.blocking_index.clear()
    with main.repository.engine.begin() as conn:
        conn.execute(merge_decisions.delete())
        conn.execute(audit_log.delete())


def load_golden() -> list[dict]:
    return json.loads(GOLDEN_PATH.read_text())


def test_candidates_reproducible():
    data = load_golden()
    response = client.post("/er/candidates", json={"records": data, "threshold": 0.5})
    assert response.status_code == 200
    payload = response.json()
    assert payload["comparisons"] >= 1
    candidates = payload["candidates"]
    assert len(candidates) == 1
    candidate = candidates[0]
    assert candidate["pair_id"] == "1::2"
    engineer = FeatureEngineer()
    entities = [Entity(**item) for item in data]
    expected = engineer.compute(entities[0], entities[1])
    assert candidate["features"]["name_jaccard"] == pytest.approx(expected["name_jaccard"], rel=1e-6)
    # sanity check: top features deterministic
    explanation = client.get("/er/explain", params={"pair_id": candidate["pair_id"]})
    assert explanation.status_code == 200
    explain_payload = explanation.json()
    assert explain_payload["pair_id"] == "1::2"
    assert explain_payload["features"]["name_jaccard"] > 0.0
    assert explain_payload["top_features"][0]["feature"] in explain_payload["features"]


def test_classifier_roc_auc():
    pairs = load_training_pairs()
    engineer = FeatureEngineer()
    classifier = PairwiseClassifier(engineer.FEATURE_ORDER)
    classifier.fit(pairs, engineer)
    auc = classifier.roc_auc(pairs, engineer)
    assert auc >= 0.8


def test_merge_split_and_audit():
    data = load_golden()
    client.post("/er/candidates", json={"records": data, "threshold": 0.5})
    merge_payload = {
        "entity_ids": ["1", "2"],
        "policy": {"sensitivity": "low", "legal_basis": "consent", "retention": "30d", "tags": ["gdpr"]},
        "who": "tester",
        "why": "unit test",
        "confidence": 0.9,
        "human_overrides": {"name_similarity": 1.2},
    }
    merge_response = client.post("/er/merge", json=merge_payload)
    assert merge_response.status_code == 200
    body = merge_response.json()
    assert body["scorecard"]["pair_id"] == "1::2"
    assert "Top signals" in body["scorecard"]["rationale"]
    merge_id = body["merge_id"]

    split_response = client.post("/er/split", json={"merge_id": merge_id, "who": "tester", "why": "undo"})
    assert split_response.status_code == 200
    audit = client.get("/er/audit")
    audit_data = audit.json()
    assert len(audit_data) == 2
    serialized = json.dumps(audit_data)
    assert "Alice" not in serialized
    assert "tester" in serialized


def test_migrations_and_rollback():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    repo = DecisionRepository(engine)
    migrations = MigrationManager(engine)
    migrations.apply()
    inspector = inspect(engine)
    assert inspector.has_table("er_merge_decisions")

    scorecard = MergeScorecard(
        pair_id="x::y",
        score=0.9,
        top_features=[FeatureAttribution(feature="name_jaccard", value=0.9, weight=1.0, contribution=0.9)],
        rationale="Top signals: name_jaccard=0.90",
    )
    policy = Policy(sensitivity="low", legal_basis="consent", retention="30d", tags=["gdpr"])
    merge_id = repo.record_merge(["x", "y"], policy, scorecard, 0.9, 0.9, None, "tester")
    assert repo.fetch_merge(merge_id)["merge_id"] == merge_id

    migrations.rollback_last()
    inspector = inspect(engine)
    assert not inspector.has_table("er_merge_decisions")
