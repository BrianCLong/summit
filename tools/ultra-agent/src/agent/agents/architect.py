class ArchitectAgent:
    def __init__(self, llm): self.llm = llm

    async def design_system(self, request: str, system_prompt: str) -> dict:
        prompt = f"""
{system_prompt}

ROLE: ARCHITECT AGENT
TASK: Design the complete architecture.

REQUIREMENTS:
- Full component diagram (text)
- Data model definitions
- API contract definitions
- Module boundaries
- Tech stack
- Performance, scalability, security considerations
- 7th+ order extrapolation

Return JSON dictionary:
{{
  "architecture": "...",
  "components": ["..."],
  "api": "...",
  "models": "...",
  "notes": "..."
}}
"""
        return await self.llm.call(prompt)
