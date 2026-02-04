from typing import Any, Dict, List, Optional
from summit.ingest.flatten import StructuredFlattener
from summit.ingest.flatten_policy import FlatteningPolicy


class IngestPipeline:
    def __init__(self, flattening_policy: Optional[FlatteningPolicy] = None):
        self.flattening_policy = flattening_policy or FlatteningPolicy(enabled=False)
        self.flattener = StructuredFlattener(self.flattening_policy)

    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single record through the ingestion stages."""
        result = data.copy()

        # 1. Flatten stage (if enabled)
        if self.flattening_policy.enabled:
            result["flattened_text"] = self.flattener.flatten(data)
            result["flattening_trace"] = self.flattener.trace(data)

        # Other stages would go here...

        return result

    def batch_process(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [self.process(r) for r in records]
