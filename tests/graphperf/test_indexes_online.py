import pytest
from unittest.mock import patch, MagicMock
from tools.graphperf.index_check import check_indexes

@patch("tools.graphperf.index_check.GraphDatabase.driver")
def test_indexes_online_success(mock_driver):
    mock_session = MagicMock()
    mock_driver.return_value.session.return_value.__enter__.return_value = mock_session
    mock_result = [
        {"name": "idx_evidence_body", "state": "ONLINE"},
        {"name": "idx_event_timestamp", "state": "ONLINE"},
        {"name": "idx_evidence_of_confidence", "state": "ONLINE"},
    ]
    mock_session.run.return_value = mock_result
    with patch("sys.exit") as mock_exit:
        check_indexes()
        mock_exit.assert_not_called()

@patch("tools.graphperf.index_check.GraphDatabase.driver")
def test_indexes_online_failure(mock_driver):
    mock_session = MagicMock()
    mock_driver.return_value.session.return_value.__enter__.return_value = mock_session
    mock_result = [
        {"name": "idx_evidence_body", "state": "POPULATING"},
        {"name": "idx_event_timestamp", "state": "ONLINE"},
    ]
    mock_session.run.return_value = mock_result
    with patch("sys.exit") as mock_exit:
        check_indexes()
        mock_exit.assert_called_with(1)
