import logging
import re
from typing import Any, Dict

logger = logging.getLogger(__name__)

class MarkdownIngestPipeline:
    def __init__(self, reject_html: bool = True):
        self.reject_html = reject_html

    def ingest(self, content: str) -> dict[str, Any]:
        """
        Process incoming document string, applying agent-optimized content ingestion.
        Returns a dict containing the parsed content and metadata.
        """
        if self.reject_html:
            # simple html tag check.
            if re.search(r'<[a-z][\s\S]*>', content, re.IGNORECASE):
                return {
                    "status": "REJECTED",
                    "reason": "HTML content detected and rejected",
                    "content": ""
                }

        # Calculate naive token count (approx by words)
        original_tokens = len(content.split())

        # Simple cleanup (markdown stripping could be more advanced here)
        cleaned_content = re.sub(r'\s+', ' ', content).strip()

        final_tokens = len(cleaned_content.split())

        if original_tokens > 0:
            token_reduction_ratio = (original_tokens - final_tokens) / original_tokens
        else:
            token_reduction_ratio = 0.0

        return {
            "status": "ACCEPTED",
            "content": cleaned_content,
            "metadata": {
                "original_tokens": original_tokens,
                "final_tokens": final_tokens,
                "token_reduction_ratio": token_reduction_ratio
            }
        }
