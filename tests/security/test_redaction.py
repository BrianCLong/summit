import pytest

from agents.policy.never_log import RedactionViolation, assert_redacted


def test_redaction_blocks_secret_patterns() -> None:
    with pytest.raises(RedactionViolation):
        assert_redacted("API_KEY=secret")
