class ReviewerAgent:
    def __init__(self, llm): self.llm = llm

    async def evaluate(self, arch, impl, tests, docs, sys_prompt) -> str:
        prompt = f"""
{sys_prompt}

ROLE: CODE REVIEWER / ARCHITECT

Review the entire package:
Architecture: {arch}
Code: {list(impl.get("files", {}).keys())}
Tests: {list(tests.get("tests", {}).keys())}

Provide a final sign-off or list of critical issues.
"""
        return await self.llm.call(prompt)
