from typing import List, Dict, Any

class AuthenticityLint:
    """
    Lints content for authenticity markers (emotion, vulnerability, lesson).
    """

    MARKERS = {
        "emotion": ["felt", "remember", "struggled", "realized", "excited", "scared"],
        "vulnerability": ["failed", "mistake", "wrong", "learned", "difficult"],
        "lesson": ["mission", "why", "tip", "step", "guide"]
    }

    def lint(self, content: str) -> Dict[str, Any]:
        results = {}
        for category, keywords in self.MARKERS.items():
            found = [w for w in keywords if w in content.lower()]
            results[category] = {
                "score": len(found) / len(keywords),
                "found": found
            }

        overall_score = sum(r["score"] for r in results.values()) / len(results)
        return {
            "overall_authenticity_score": overall_score,
            "details": results
        }

def enforce_truthfulness(content: str, mode: bool = True) -> str:
    """
    Appends a disclaimer if truthfulness mode is on.
    """
    if mode:
        return content + "\n\n(Note: This story is based on true events but may be dramatized for educational purposes.)"
    return content
