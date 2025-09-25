import os
import pathlib
import sys

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("FEATURES_NLQ", "true")

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))
from main import app  # noqa: E402
from nlq_engine import NLQEngine, NLQSecurityError, is_nlq_query_safe  # noqa: E402


@pytest.fixture
def engine() -> NLQEngine:
    return NLQEngine()


def _is_syntactically_valid(query: str) -> bool:
    normalized = query.strip().upper()
    return normalized.startswith("MATCH") or normalized.startswith("SELECT")


def test_translation_syntactic_validity(engine: NLQEngine) -> None:
    prompts = [
        ("List friends of Alice", "cypher"),
        ("List connections for Alice within 2 hops", "cypher"),
        ("Who are the friends of Bob within 2 hops?", "cypher"),
        ("Show companies connected to Carol within 3 hops", "cypher"),
        ("Show companies linked to Eve", "cypher"),
        ("Count emails sent by Carol to Dave", "sql"),
        ("How many emails from Alice to Bob?", "sql"),
        ("What teams collaborate with Security?", "cypher"),
        ("Which teams partner with Analytics?", "cypher"),
        ("Find the shortest path between Alice and Dave within 3 hops", "cypher"),
        ("Determine the shortest path between Bob and Eve", "cypher"),
    ]

    valid = 0
    for question, dialect in prompts:
        result = engine.translate(question, dialect=dialect)
        assert result.query
        assert is_nlq_query_safe(result.query)
        if _is_syntactically_valid(result.query):
            valid += 1
    assert valid / len(prompts) >= 0.95


def test_depth_limit_property(engine: NLQEngine) -> None:
    depth_cap = engine.depth_limit
    for requested_depth in range(1, depth_cap * 2 + 1):
        question = f"List friends of Alice within {requested_depth} hops"
        translation = engine.translate(question)
        applied_depth = min(requested_depth, depth_cap)
        assert f"*1..{applied_depth}" in translation.query
        if requested_depth > depth_cap:
            assert any("exceeds limit" in warning for warning in translation.warnings)
        run_result = engine.run_sandbox(translation.query)
        if run_result.actual_count > 0:
            ratio = abs(translation.cost - run_result.actual_count) / run_result.actual_count
            assert ratio <= 0.2


def test_run_sandbox_enforces_limits_and_redaction(engine: NLQEngine) -> None:
    translation = engine.translate("List friends of Alice within 3 hops")
    run_result = engine.run_sandbox(translation.query, limit=100)
    assert len(run_result.rows) <= engine.row_cap
    assert any("Policy redacted fields" in warning for warning in run_result.warnings)
    for row in run_result.rows:
        assert "ssn" not in row


def test_run_sandbox_blocks_writes(engine: NLQEngine) -> None:
    with pytest.raises(NLQSecurityError):
        engine.run_sandbox("CREATE (n)")


def test_manual_vs_generated_queries(engine: NLQEngine) -> None:
    question = "List friends of Alice within 2 hops"
    generated_translation = engine.translate(question)
    generated_rows = engine.run_sandbox(generated_translation.query).rows

    manual_query = (
        "MATCH (person:Person {name: 'Alice'})-[:FRIEND*1..2]->(friend:Person)\n"
        "WITH person, friend, length(shortestPath((person)-[:FRIEND*]->(friend))) AS hops\n"
        "RETURN DISTINCT friend.name AS name, friend.title AS title, hops\n"
        "ORDER BY hops ASC, name ASC\n"
        "LIMIT 25"
    )
    manual_rows = engine.run_sandbox(manual_query).rows
    assert manual_rows == generated_rows

    company_translation = engine.translate("Show companies connected to Carol within 2 hops")
    generated_company_rows = engine.run_sandbox(company_translation.query).rows
    manual_company_query = (
        "MATCH (person:Person {name: 'Carol'})-[:FRIEND*0..2]->(peer:Person)\n"
        "MATCH (peer)-[:WORKS_AT]->(company:Company)\n"
        "WITH DISTINCT company, min(length(shortestPath((person)-[:FRIEND*]->(peer)))) AS hops\n"
        "RETURN company.name AS company, hops\n"
        "ORDER BY hops ASC, company ASC\n"
        "LIMIT 25"
    )
    manual_company_rows = engine.run_sandbox(manual_company_query).rows
    assert manual_company_rows == generated_company_rows


def test_cost_preview_within_tolerance(engine: NLQEngine) -> None:
    questions = [
        "List friends of Alice",
        "Show companies connected to Bob within 2 hops",
        "Count emails sent by Carol to Dave",
        "What teams collaborate with Security?",
    ]
    for question in questions:
        translation = engine.translate(question)
        run_result = engine.run_sandbox(translation.query)
        if run_result.actual_count == 0:
            continue
        diff = abs(translation.cost - run_result.actual_count)
        assert diff / run_result.actual_count <= 0.2


def test_e2e_preview_run_flow() -> None:
    client = TestClient(app)
    translate_payload = {"question": "List friends of Alice within 2 hops", "dialect": "cypher"}
    translate_response = client.post("/nlq/translate", json=translate_payload)
    assert translate_response.status_code == 200
    translate_data = translate_response.json()
    assert translate_data["query"].startswith("MATCH")

    run_response = client.post(
        "/nlq/run-sandbox",
        json={"query": translate_data["query"], "limit": 5},
    )
    assert run_response.status_code == 200
    run_data = run_response.json()
    assert isinstance(run_data["rows"], list)
    assert not any("ssn" in row for row in run_data["rows"])

    explain_response = client.post("/nlq/explain", json={"query": translate_data["query"]})
    assert explain_response.status_code == 200
    explain_data = explain_response.json()
    assert explain_data["plan"]["operation"] == "friends"


def test_sandbox_limit_truncation(engine: NLQEngine) -> None:
    translation = engine.translate("List connections for Alice within 3 hops")
    result = engine.run_sandbox(translation.query, limit=1)
    assert result.truncated is True
    assert len(result.rows) == 1


def test_policy_warning_persists_in_explain(engine: NLQEngine) -> None:
    translation = engine.translate("List friends of Alice within 5 hops")
    explain = engine.explain(translation.query)
    if translation.warnings:
        assert explain.warnings == translation.warnings


def test_manual_query_inference(engine: NLQEngine) -> None:
    query = (
        "SELECT\n"
        "  'Carol' AS sender,\n"
        "  'Dave' AS recipient,\n"
        "  COUNT(*) AS count\n"
        "FROM emails\n"
        "WHERE sender = 'Carol' AND recipient = 'Dave';"
    )
    result = engine.run_sandbox(query)
    assert result.actual_count == 1
    assert result.rows[0]["count"] == 2
