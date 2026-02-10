import pytest
from summit.agentkit.cost.ledger import CostLedger

def test_cost_accumulation():
    ledger = CostLedger(limit_usd=10.0)
    ledger.record(1.0)
    ledger.record(2.5)
    assert ledger.total_cost == 3.5

def test_cost_cap_enforcement():
    ledger = CostLedger(limit_usd=5.0)
    ledger.record(3.0)
    with pytest.raises(RuntimeError, match="Cost limit exceeded"):
        ledger.record(2.1)
