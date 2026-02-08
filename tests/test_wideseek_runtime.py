import pytest
import asyncio
from summit.agents.wideseek import WideSeekOrchestrator, WideSeekBudgets

async def mock_llm(messages):
    return "Mock LLM Response"

def test_wideseek_orchestrator_basic_flow():
    async def run_test():
        budgets = WideSeekBudgets(max_subagents=3)
        orch = WideSeekOrchestrator(llm=mock_llm, tools=[], budgets=budgets)

        result = await orch.run("Test Query", subagents=2)

        assert "final_md" in result
        assert result["stats"]["subagents"] == 2
        assert result["final_md"] == "Mock LLM Response"

    asyncio.run(run_test())

def test_wideseek_budgets_enforced():
    async def run_test():
        budgets = WideSeekBudgets(max_subagents=1)
        orch = WideSeekOrchestrator(llm=mock_llm, tools=[], budgets=budgets)

        result = await orch.run("Test Query", subagents=5)

        assert result["stats"]["subagents"] == 1

    asyncio.run(run_test())
