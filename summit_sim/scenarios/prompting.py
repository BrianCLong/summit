from typing import Any, Dict


class PromptBuilder:
    @staticmethod
    def build_prompt(agent_role: str, history: list) -> str:
        history_text = "\n".join([f"{item['agent_id']}: {item['text']}" for item in history])
        return f"You are a {agent_role}. Conversation history:\n{history_text}\nResponse:"
