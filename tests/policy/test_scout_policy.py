import pytest

from summit.policy.scouts import check_allowlist, check_budget
from summit.scouts.base import Config, Result


def test_budget_exceeded():
    cfg = Config(max_cost_ms=100)
    res = Result(cost_ms=101)
    assert check_budget(res, cfg) is False

def test_budget_ok():
    cfg = Config(max_cost_ms=100)
    res = Result(cost_ms=99)
    assert check_budget(res, cfg) is True

def test_allowlist_denied():
    cfg = Config(allowlisted_tools=["ls"])
    assert check_allowlist("rm", cfg) is False

def test_allowlist_allowed():
    cfg = Config(allowlisted_tools=["ls"])
    assert check_allowlist("ls", cfg) is True

def test_timestamp_leak():
    # Placeholder for timestamp leak test as per plan
    pass
