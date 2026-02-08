from typing import List, Dict, Any

class ContextAwareSummarizer:
    """
    Generates summaries while tracking context deltas (omissions, reorderings).
    """
    def __init__(self):
        pass

    def summarize_list(self, items: List[str], max_items: int = 3) -> Dict[str, Any]:
        """
        Summarize a list of items by taking the top N.
        Report omissions in context_deltas.
        """
        original_count = len(items)
        summary_items = items[:max_items]
        omitted_items = items[max_items:]

        summary_text = ", ".join(summary_items)
        if omitted_items:
            summary_text += f" (and {len(omitted_items)} more)"

        return {
            "summary_text": summary_text,
            "context_deltas": {
                "omitted_count": len(omitted_items),
                "reordered_count": 0, # Simple truncation doesn't reorder
                "details": [f"Omitted: {item}" for item in omitted_items]
            }
        }

    def summarize_text(self, text: str, max_chars: int = 100) -> Dict[str, Any]:
        """
        Summarize text by truncation.
        """
        if len(text) <= max_chars:
            return {
                "summary_text": text,
                "context_deltas": {
                    "omitted_count": 0,
                    "reordered_count": 0,
                    "details": []
                }
            }

        summary_text = text[:max_chars] + "..."
        omitted_text = text[max_chars:]

        return {
            "summary_text": summary_text,
            "context_deltas": {
                "omitted_count": len(omitted_text),
                "reordered_count": 0,
                "details": [f"Truncated {len(omitted_text)} chars"]
            }
        }
