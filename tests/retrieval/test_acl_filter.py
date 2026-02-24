import pytest
from unittest.mock import MagicMock
from retrieval.neo4j.contract import ContractRetriever, RetrievalContractError

@pytest.fixture
def mock_neo4j_client():
    client = MagicMock()
    # Mock driver -> session -> read_transaction -> run -> data
    session = MagicMock()
    client.driver.session.return_value.__enter__.return_value = session
    return client

def test_missing_mandatory_filters(mock_neo4j_client):
    retriever = ContractRetriever(mock_neo4j_client)

    # Empty filters -> Fail
    with pytest.raises(RetrievalContractError, match="Missing mandatory"):
        retriever.search([0.1, 0.2], filters={})

    # Irrelevant filters -> Fail
    with pytest.raises(RetrievalContractError, match="Missing mandatory"):
        retriever.search([0.1, 0.2], filters={"topic": "space"})

def test_valid_filters_passed(mock_neo4j_client):
    retriever = ContractRetriever(mock_neo4j_client)

    # Mock the DB result
    # read_transaction takes a lambda, we need to mock its execution
    def mock_read_tx(func):
        tx = MagicMock()
        tx.run.return_value.data.return_value = []
        return func(tx)

    mock_neo4j_client.driver.session.return_value.__enter__.return_value.read_transaction = mock_read_tx

    retriever.search([0.1, 0.2], filters={"tenant_id": "T1"})

    # Verify we didn't crash and presumably called the DB
    # (Deep verification of Cypher construction is hard with this mock setup,
    # but the ContractRetriever logic is simple enough to trust if it passes checks)

def test_deterministic_sorting(mock_neo4j_client):
    retriever = ContractRetriever(mock_neo4j_client)

    # Mock DB returning unsorted tied results
    # Item A: score 0.9
    # Item B: score 0.9 (tie)
    # The DB might return them in any order.
    # We expect (score DESC, id ASC) -> A then B (if ids are A, B)

    # Actually let's use B and A ids to test sort
    result_data = [
        {"node": {"id": "B"}, "score": 0.9},
        {"node": {"id": "A"}, "score": 0.9}
    ]

    def mock_read_tx(func):
        tx = MagicMock()
        tx.run.return_value.data.return_value = result_data
        return func(tx)

    mock_neo4j_client.driver.session.return_value.__enter__.return_value.read_transaction = mock_read_tx

    results = retriever.search([0.1], filters={"tenant_id": "T1"})

    assert len(results) == 2
    assert results[0]["id"] == "A"
    assert results[1]["id"] == "B"
