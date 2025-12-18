class DevOpsAgent:
    def __init__(self, llm): self.llm = llm

    async def build(self, arch: dict, impl: dict, sys_prompt: str) -> dict:
        prompt = f"""
{sys_prompt}

ROLE: DEVOPS ENGINEER

Generate Infrastructure as Code and CI/CD:
- Dockerfile
- GitHub Actions
- Terraform (if needed)

Return JSON: {{ "files": {{ "Dockerfile": "..." }} }}
"""
        return await self.llm.call(prompt)
