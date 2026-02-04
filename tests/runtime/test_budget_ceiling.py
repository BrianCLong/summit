from summit.runtime.budget import Budget


def test_budget_starts_ok():
    b = Budget(max_tokens=100, max_usd=1.0)
    assert b.check()
    assert b.stop_reason is None

def test_budget_ceiling_tokens():
    b = Budget(max_tokens=100, max_usd=1.0)
    b.consume(tokens=50, usd=0.1)
    assert b.check()
    b.consume(tokens=51, usd=0.1)
    assert not b.check()
    assert b.stop_reason == "BUDGET_CEILING_TOKENS"

def test_budget_ceiling_usd():
    b = Budget(max_tokens=1000, max_usd=1.0)
    b.consume(tokens=10, usd=0.5)
    assert b.check()
    b.consume(tokens=10, usd=0.6)
    assert not b.check()
    assert b.stop_reason == "BUDGET_CEILING_USD"
