import json
from typing import List, Dict, Any, Optional
from summit.osint.redaction import Redactor

class ContextShadow:
    """
    Captures context lineage (adjacency) and applies redaction.
    """
    def __init__(self, source_id: str):
        self.source_id = source_id
        self.adjacency: List[Dict[str, Any]] = []
        self.redactor = Redactor()

    def add_adjacency(self, type_: str, content: Dict[str, Any], rank: int):
        """
        Add adjacent item (recommendation, reply, etc).
        Content is automatically redacted.
        """
        clean_content = self.redactor.clean_obj(content)

        # Calculate content hash for determinism and linkage
        content_str = json.dumps(clean_content, sort_keys=True)
        content_hash = self.redactor.hash_value(content_str)

        entry = {
            "type": type_,
            "content_hash": content_hash,
            "rank": rank,
            # We store the redacted content to allow reconstruction of the shadow context
            "redacted_content": clean_content
        }
        self.adjacency.append(entry)

    def export_lineage(self) -> Dict[str, Any]:
        """
        Export the lineage artifact conforming to context.lineage.schema.json
        """
        return {
            "source_id": self.source_id,
            "adjacency": [
                {
                    "type": x["type"],
                    "content_hash": x["content_hash"],
                    "rank": x["rank"]
                }
                for x in self.adjacency
            ],
            "redaction_report": {
                "pii_redacted_count": sum(self.redactor.get_counts().values())
            }
        }

    def get_full_shadow(self) -> Dict[str, Any]:
        """
        Return the full shadow with redacted content (internal use/debugging).
        """
        return {
            "source_id": self.source_id,
            "adjacency": self.adjacency,
            "redaction_report": self.redactor.get_counts()
        }
