import pytest
from maestro.runtime.effort_budget.budget import EffortBudget, BudgetTracker
from maestro.runtime.effort_budget.adapter import GPT53CodexAdapter

def test_budget_tracking():
    budget = EffortBudget(max_tokens=2000, max_steps=2)
    tracker = BudgetTracker(budget)
    assert tracker.check_budget() is True
    tracker.record_usage(tokens=1500)
    assert tracker.check_budget() is True
    tracker.record_usage(tokens=600)
    assert tracker.check_budget() is False

@pytest.mark.asyncio
async def test_gpt53_adapter():
    budget = EffortBudget(effort_level="high", max_tokens=2000)
    adapter = GPT53CodexAdapter()
    messages = [{"role": "user", "content": "Write code."}]
    response = await adapter.call_model(messages, budget)
    assert response["model"] == "gpt-5.3-codex"
    assert "high effort" in response["choices"][0]["message"]["content"]
