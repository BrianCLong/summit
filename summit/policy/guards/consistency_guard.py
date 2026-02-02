import re
from typing import List, Dict

class ConsistencyGuard:
    """
    Guard to detect consistency issues in agent transcripts, such as identity confusion,
    temporal contradictions, or mixed language hallucinations.
    """

    def check(self, transcript: List[Dict[str, str]]) -> bool:
        """
        Returns True if the transcript passes consistency checks.
        Returns False if a heuristic triggers a consistency violation.
        """
        # specific heuristics based on "Known issues"

        # 1. Identity Consistency
        # Check for claiming to be other models
        full_text = "\n".join([m.get("content", "") for m in transcript if m.get("role") == "assistant"])

        # Known identity hallucinations
        identity_patterns = [
            r"I am (ChatGPT|Claude|Llama|Gemini|Mistral)",
            r"trained by (OpenAI|Google|Meta|Anthropic)"
        ]

        for pattern in identity_patterns:
            if re.search(pattern, full_text, re.IGNORECASE):
                # Allow if it says "I am NOT ..."
                # But simple regex is brittle.
                # For deny-by-default, we flag it.
                return False

        # 2. Temporal Consistency
        # Check for contradicting years in "Today is ..." statements
        # e.g. "Today is Jan 1, 2023" ... "Today is Jan 1, 2024"
        years = re.findall(r"Today is [A-Za-z]+ \d+, (\d{4})", full_text)
        if len(set(years)) > 1:
            return False

        return True
