import pytest
from unittest.mock import patch
from summit.integrations.palantir_gotham import CaseAuditLogger

@patch('summit.integrations.palantir_gotham.emit')
def test_case_audit_crud(mock_emit):
    logger = CaseAuditLogger("agent_007")

    # Create
    logger.create_case("CASE-123", "Operation Skyfall")
    assert mock_emit.call_count == 1
    args, _ = mock_emit.call_args
    event = args[0]
    assert event.action == "create"
    assert event.metadata["case_id"] == "CASE-123"

    # Comment
    logger.add_comment("CASE-123", "Target acquired")
    assert mock_emit.call_count == 2
    args, _ = mock_emit.call_args
    assert args[0].action == "comment_add"

    # Close
    logger.close_case("CASE-123", "Mission Accomplished")
    assert mock_emit.call_count == 3
    args, _ = mock_emit.call_args
    assert args[0].metadata["new_status"] == "CLOSED"
