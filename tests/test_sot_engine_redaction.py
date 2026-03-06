import asyncio

from summit.orchestration.society_of_thought import SocietyOfThoughtEngine


class MockLLM:
    async def complete(self, prompt, system_prompt=None, context=None):
        if "Planner" in system_prompt:
            return "Plan for bob@work.com"
        if "CriticalVerifier" in system_prompt:
            return "- Challenge 1\n- Challenge 2"
        return "Final reconciled plan"

def test_engine_redaction():
    engine = SocietyOfThoughtEngine(MockLLM(), enabled=True)
    result = asyncio.run(engine.run("task"))
    assert result["mode"] == "society_of_thought"
    assert result["debate"][0]["text"] == "Plan for [REDACTED_EMAIL]"
