import asyncio
from typing import List, Dict, Any, Callable
from .context import WideSeekContext
from .budgets import WideSeekBudgets

class WideSeekOrchestrator:
    def __init__(self, llm: Callable, tools: List[Any], budgets: WideSeekBudgets = WideSeekBudgets()):
        self.llm = llm
        self.tools = tools
        self.budgets = budgets
        self.main_context = WideSeekContext(parent_id="lead", isolated=False)
        self.subagent_contexts: Dict[str, WideSeekContext] = {}

    async def run(self, query: str, subagents: int = 3) -> Dict[str, Any]:
        """
        Main entry point for the WideSeek flow.
        1. Lead agent analyzes query.
        2. Lead agent spawns subagents (simulated via call_subagent or just loop).
        3. Subagents execute in parallel (simulated here with asyncio).
        4. Lead agent aggregates results.
        """

        # Enforce subagent limit
        num_subagents = min(subagents, self.budgets.max_subagents)

        # 1. Lead Agent Analysis (Simplified for runtime skeleton)
        self.main_context.add_message("user", f"Task: {query}")

        # 2. Spawn Subagents
        tasks = []
        for i in range(num_subagents):
            sub_id = f"subagent_{i}"
            tasks.append(self._run_subagent(sub_id, query))

        results = await asyncio.gather(*tasks)

        # 3. Aggregate
        aggregation_prompt = f"Query: {query}\n\nSubagent Results:\n"
        for res in results:
            aggregation_prompt += f"- {res}\n"
        aggregation_prompt += "\nCreate a final markdown report."

        self.main_context.add_message("system", aggregation_prompt)
        # Mock LLM call for aggregation
        final_response = await self.llm(self.main_context.get_history())

        return {
            "final_md": final_response,
            "tool_trace": [], # TODO: populate
            "stats": {
                "subagents": num_subagents,
                "results_count": len(results)
            }
        }

    async def _run_subagent(self, agent_id: str, query: str) -> str:
        ctx = self.main_context.fork(agent_id)
        ctx.add_message("system", f"You are {agent_id}. Search for info on: {query}")
        self.subagent_contexts[agent_id] = ctx

        # Mock subagent execution (1 turn)
        response = await self.llm(ctx.get_history())
        return f"[{agent_id}] found: {response}"
