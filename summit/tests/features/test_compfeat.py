import pytest
from summit.features.compfeat.engine import run_compfeat, CompFeatInput

def test_run_compfeat_returns_placeholder():
    input_data = CompFeatInput(raw={"some": "data"})
    result = run_compfeat(input_data)

    assert result.status == "not_implemented"
    assert result.details == {"hint": "wire competitor spec in follow-up"}
