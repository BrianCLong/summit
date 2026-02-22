import json
from typing import Any, Dict, List

from summit.ingest.flatten_policy import FlatteningPolicy


class StructuredFlattener:
    def __init__(self, policy: FlatteningPolicy):
        self.policy = policy

    def flatten(self, data: dict[str, Any]) -> str:
        if not self.policy.enabled:
            return json.dumps(data, sort_keys=True)

        parts = []
        self._flatten_recursive(data, "", parts, 0)
        return ". ".join(parts) + "."

    def _flatten_recursive(self, data: Any, prefix: str, parts: list[str], depth: int):
        if depth > self.policy.max_depth:
            return

        if isinstance(data, dict):
            # Deterministic sorting of keys
            for key in sorted(data.keys()):
                if not self.policy.is_allowed(key):
                    continue

                value = data[key]
                full_key = f"{prefix}.{key}" if prefix else key
                self._flatten_recursive(value, full_key, parts, depth + 1)

        elif isinstance(data, list):
            # Limit list items
            for i, item in enumerate(data[:self.policy.max_list_items]):
                self._flatten_recursive(item, f"{prefix}[{i}]", parts, depth + 1)

        else:
            # Leaf node
            val_str = str(data).strip()
            # Basic redaction if value matches patterns (placeholder for more robust module)
            if prefix:
                parts.append(f"{prefix}: {val_str}")
            else:
                parts.append(val_str)

    def trace(self, data: dict[str, Any]) -> dict[str, Any]:
        """Produce a trace of the flattening process."""
        included_keys = []
        excluded_keys = []

        def collect_keys(d, p, dep):
            if dep > self.policy.max_depth: return
            if isinstance(d, dict):
                for k in d:
                    pk = f"{p}.{k}" if p else k
                    if self.policy.is_allowed(k):
                        included_keys.append(pk)
                        collect_keys(d[k], pk, dep + 1)
                    else:
                        excluded_keys.append(pk)
            elif isinstance(d, list):
                for i, item in enumerate(d[:self.policy.max_list_items]):
                    pk = f"{p}[{i}]"
                    included_keys.append(pk)
                    collect_keys(item, pk, dep + 1)

        collect_keys(data, "", 0)
        return {
            "included_count": len(included_keys),
            "excluded_count": len(excluded_keys),
            "excluded_keys": excluded_keys
        }
