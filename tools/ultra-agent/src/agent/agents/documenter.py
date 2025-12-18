class DocumenterAgent:
    def __init__(self, llm): self.llm = llm

    async def document(self, arch: dict, impl: dict, sys_prompt: str) -> dict:
        prompt = f"""
{sys_prompt}

ROLE: DOCUMENTATION SPECIALIST

Generate comprehensive documentation:
- README
- API Docs
- Deployment Guide

Return JSON: {{ "files": {{ "docs/README.md": "..." }} }}
"""
        return await self.llm.call(prompt)
