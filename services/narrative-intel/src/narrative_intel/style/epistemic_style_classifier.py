from typing import List

class EpistemicStyleClassifier:
    def classify_style(self, text: str) -> List[str]:
        """
        Classifies the epistemic style of the text (e.g., academic, anecdotal, data-viz).
        """
        # Placeholder
        return ["academic"]

    def detect_style_shift(self, text_segments: List[str]) -> float:
        """
        Detects shift in style across segments (0.0 to 1.0).
        """
        return 0.1
