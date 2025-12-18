class TesterAgent:
    def __init__(self, llm): self.llm = llm

    async def generate_tests(self, arch: dict, code_map: dict, sys_prompt: str) -> dict:
        prompt = f"""
{sys_prompt}

ROLE: TEST ENGINEER

Generate full test suite:
- unit tests
- integration
- property-based
- fuzz
- performance

Input architecture:
{arch}

Input code map keys:
{list(code_map.keys())}

RETURN JSON: {{ "tests": {{ "path/to/test": "content" }} }}
"""
        return await self.llm.call(prompt)

    async def improve(self, arch: dict, tests: dict, feedback: str, sys_prompt: str) -> dict:
        prompt = f"""
{sys_prompt}

ROLE: TEST ENGINEER (Refactor Phase)

Improve the tests based on feedback:
{feedback}

Return JSON with updated tests: {{ "tests": {{ "path/to/test": "content" }} }}
"""
        return await self.llm.call(prompt)
