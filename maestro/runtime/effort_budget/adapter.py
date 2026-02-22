from typing import Dict, Any, List, Optional
from .budget import EffortBudget

import os

class GPT53CodexAdapter:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "sk-placeholder")

    def map_params(self, budget: EffortBudget) -> Dict[str, Any]:
        return {"effort": budget.effort_level, "max_completion_tokens": budget.max_tokens or 4096}

    async def call_model(self, messages: List[Dict[str, str]], budget: EffortBudget) -> Dict[str, Any]:
        return {
            "model": "gpt-5.3-codex",
            "choices": [{"message": {"role": "assistant", "content": f"Task executed with {budget.effort_level} effort reasoning."}}],
            "usage": {"total_tokens": 1500}
        }
