from typing import Dict, Any, List
from dataclasses import dataclass

@dataclass
class CompactedState:
    summary: str
    encrypted_content: str
    invariant_check: bool

class CompactionAdapter:
    def compact_items(self, items: List[Dict[str, Any]]) -> CompactedState:
        """
        Simulates compaction. In a real scenario, this would call the /responses/compact endpoint.
        """
        # Stub implementation
        summary = f"Compacted {len(items)} items."
        encrypted = "opaque_blob_simulated"
        return CompactedState(summary=summary, encrypted_content=encrypted, invariant_check=True)

    def restore_from_compact(self, state: CompactedState) -> List[Dict[str, Any]]:
        """
        Restoring from compaction.
        """
        return [
            {"role": "system", "content": f"Previous conversation summary: {state.summary}"},
            {"role": "system", "content": f"<encrypted_state>{state.encrypted_content}</encrypted_state>"}
        ]
