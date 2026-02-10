import pytest
from summit.agentkit.typing import TypedResult, validate_or_retry

def test_typed_result_instantiation():
    res = TypedResult(value=42)
    assert res.value == 42

def test_retry_on_failure():
    attempts = 0
    def flaky_fn():
        nonlocal attempts
        attempts += 1
        if attempts < 2:
            raise ValueError("flaky")
        return "success"

    result = validate_or_retry(flaky_fn, retries=2)
    assert result == "success"
    assert attempts == 2

def test_fail_after_retries():
    attempts = 0
    def failing_fn():
        nonlocal attempts
        attempts += 1
        raise ValueError("failed")

    with pytest.raises(ValueError, match="failed"):
        validate_or_retry(failing_fn, retries=2)
    assert attempts == 3
