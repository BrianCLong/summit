from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
import time
from .redact import Redactor

@dataclass
class MemoryEntry:
    id: str
    content: Dict[str, Any]
    timestamp: float

class MemoryStore:
    def __init__(self, redactor: Optional[Redactor] = None):
        self.entries: List[MemoryEntry] = []
        self.redactor = redactor or Redactor()

    def add(self, content: Dict[str, Any]) -> str:
        """Add a memory entry, automatically redacted."""
        safe_content = self.redactor.redact_obj(content)
        entry_id = f"MEM-{len(self.entries) + 1:04d}"
        entry = MemoryEntry(
            id=entry_id,
            content=safe_content,
            timestamp=time.time()
        )
        self.entries.append(entry)
        return entry_id

    def get(self, entry_id: str) -> Optional[Dict[str, Any]]:
        for entry in self.entries:
            if entry.id == entry_id:
                return asdict(entry)
        return None

    def search(self, keyword: str) -> List[Dict[str, Any]]:
        results = []
        for entry in self.entries:
            # Simple string search in redacted content
            if keyword in str(entry.content):
                results.append(asdict(entry))
        return results
