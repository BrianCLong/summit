from typing import List, Dict, Any, Optional

class ClarifyStep:
    """
    Represents a multi-choice clarification step.
    Mirrors Mistral Vibe 2.0's 'ask before act'.
    """
    def __init__(self, message: str, choices: List[str]):
        self.message = message
        self.choices = choices
        self.selected_choice: Optional[str] = None

    def prompt(self) -> Dict[str, Any]:
        """
        Returns the clarification prompt structure.
        """
        return {
            "message": self.message,
            "choices": self.choices
        }

    def select(self, choice: str) -> str:
        """
        Selects a choice. Raises ValueError if invalid.
        """
        if choice not in self.choices:
            raise ValueError(f"Invalid choice: {choice}")
        self.selected_choice = choice
        return choice
