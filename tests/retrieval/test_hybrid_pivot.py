import os
import pytest
from unittest.mock import MagicMock, patch
from retrieval.neo4j.contract import ContractRetriever
from retrieval.neo4j.hybrid_pivot import HybridRetriever, PivotRetriever

@pytest.fixture
def mock_contract_retriever():
    retriever = MagicMock(spec=ContractRetriever)
    retriever.search.return_value = [{"id": "P1", "score": 0.9}]
    return retriever

@pytest.fixture
def mock_neo4j_client():
    client = MagicMock()
    session = MagicMock()
    client.driver.session.return_value.__enter__.return_value = session
    return client

def test_hybrid_disabled_by_default(mock_contract_retriever):
    with patch.dict(os.environ, {}, clear=True):
        hr = HybridRetriever(mock_contract_retriever)
        assert hr.enabled is False
        results = hr.search("query", [0.1], filters={"t": "1"})
        assert len(results) == 1
        # Should rely on contract retriever
        mock_contract_retriever.search.assert_called_once()

def test_pivot_expansion_enabled(mock_contract_retriever, mock_neo4j_client):
    with patch.dict(os.environ, {"SUMMIT_PIVOT_EXPAND": "1"}):
        pr = PivotRetriever(mock_contract_retriever, mock_neo4j_client)
        assert pr.enabled is True

        # Mock DB response for expansion
        def mock_read_tx(func):
            tx = MagicMock()
            tx.run.return_value.data.return_value = [
                {"source": "P1", "target": "C1", "rel_type": "RELATED"}
            ]
            return func(tx)

        mock_neo4j_client.driver.session.return_value.__enter__.return_value.read_transaction = mock_read_tx

        result = pr.search_and_expand([0.1], filters={"t": "1"})

        assert "pivots" in result
        assert "context" in result
        assert len(result["context"]) == 1
        assert result["context"][0]["target"] == "C1"

def test_pivot_expansion_disabled(mock_contract_retriever, mock_neo4j_client):
    with patch.dict(os.environ, {"SUMMIT_PIVOT_EXPAND": "0"}):
        pr = PivotRetriever(mock_contract_retriever, mock_neo4j_client)
        assert pr.enabled is False

        result = pr.search_and_expand([0.1], filters={"t": "1"})

        assert "pivots" in result
        assert result["context"] == [] # Empty because disabled
