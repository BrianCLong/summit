class EngineerAgent:
    def __init__(self, llm): self.llm = llm

    async def implement(self, arch: dict, sys_prompt: str) -> dict:
        prompt = f"""
{sys_prompt}

ROLE: IMPLEMENTATION ENGINEER

Use this architecture to implement the full codebase:
{arch}

Return JSON: {{ "files": {{ "path/to/file": "content" }} }}
"""
        return await self.llm.call(prompt)

    async def improve(self, arch: dict, impl: dict, feedback: str, sys_prompt: str) -> dict:
        prompt = f"""
{sys_prompt}

ROLE: IMPLEMENTATION ENGINEER (Refactor Phase)

Improve the codebase based on feedback:
{feedback}

Architecture: {arch}
Current Implementation Keys: {list(impl.get("files", {}).keys())}

Return JSON with updated files: {{ "files": {{ "path/to/file": "content" }} }}
"""
        return await self.llm.call(prompt)
