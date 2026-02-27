import hashlib
import json
import random
import os
import yaml
from typing import Dict, Any, Union, List

class PlanSampler:
    def __init__(self, config_path: str = "telemetry/plan_sampler_config.yml"):
        self.config_path = config_path
        self.config = self._load_config()
        self.enabled = self.config.get("enabled", True)

        # Check env var override
        if os.getenv("PLAN_SAMPLER_ENABLED") == "false":
            self.enabled = False

    def _load_config(self) -> Dict[str, Any]:
        if not os.path.exists(self.config_path):
            return {"enabled": True, "default_rate": 0.01, "overrides": []}
        try:
            with open(self.config_path, "r") as f:
                return yaml.safe_load(f) or {}
        except Exception as e:
            # Fallback to defaults on error
            print(f"Warning: Failed to load config from {self.config_path}: {e}")
            return {"enabled": True, "default_rate": 0.01, "overrides": []}

    def should_sample(self, query: str) -> bool:
        """
        Determines if a query plan should be sampled based on the configuration.
        """
        if not self.enabled:
            return False

        rate = self.config.get("default_rate", 0.01)
        overrides = self.config.get("overrides", [])

        # Check for overrides
        if overrides:
            for override in overrides:
                pattern = override.get("pattern", "")
                override_rate = override.get("rate")
                # Ensure pattern matches and rate is valid
                if pattern and pattern in query and override_rate is not None:
                    rate = override_rate
                    break

        return random.random() < rate

    def canonicalize_plan(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Removes non-deterministic fields (timestamps, memory addresses, specific timing metrics)
        and returns a canonical dictionary suitable for stable hashing.
        """
        # Deep copy to avoid modifying original input
        try:
            # Simple deep copy via JSON round-trip
            clean_plan = json.loads(json.dumps(plan))
        except (TypeError, ValueError):
            # If plan is not JSON serializable, return empty or handle error gracefully
            return {}

        return self._clean_node(clean_plan)

    def _clean_node(self, node: Any) -> Any:
        if isinstance(node, dict):
            # Remove keys that introduce non-determinism (timestamps, execution metrics)
            keys_to_remove = []
            for k in list(node.keys()):
                lower_k = k.lower()
                # Remove common non-deterministic fields in query plans
                if "time" in lower_k or "timestamp" in lower_k or                    "memory" in lower_k or "pagecache" in lower_k or                    "dbhits" in lower_k or "rows" in lower_k:
                    keys_to_remove.append(k)

            for k in keys_to_remove:
                del node[k]

            # Recursively clean values
            cleaned_items = {}
            for k, v in node.items():
                cleaned_items[k] = self._clean_node(v)

            # Return sorted dictionary for consistent JSON serialization
            return dict(sorted(cleaned_items.items()))

        elif isinstance(node, list):
            return [self._clean_node(x) for x in node]

        return node

    def get_plan_fingerprint(self, plan: Dict[str, Any]) -> str:
        """
        Returns the SHA256 hash of the canonicalized plan.
        """
        canonical = self.canonicalize_plan(plan)
        # sort_keys=True ensures consistent JSON string representation for hashing
        plan_json = json.dumps(canonical, sort_keys=True)
        return hashlib.sha256(plan_json.encode("utf-8")).hexdigest()

if __name__ == "__main__":
    # Simple test execution to verify basic functionality
    sampler = PlanSampler()

    # Test Override Logic
    test_queries = [
        ("MATCH (n) RETURN n", 0.01),
        ("MATCH (e:Evidence)-[:DERIVED_FROM]->", 0.10)
    ]

    print(f"Config loaded: {sampler.config}")

    for q, expected_rate in test_queries:
        should = sampler.should_sample(q)
        print(f"Query: '{q}' -> Sampled? {should}")

    # Test Canonicalization
    dummy_plan = {
        "operatorType": "ProduceResults",
        "runtime-impl": "pipelined",
        "Timestamp": 123456789,
        "Details": {
            "executionTime": 42,
            "pageCacheMisses": 5,
            "dbHits": 100,
            "params": {"a": 1}
        }
    }

    canonical = sampler.canonicalize_plan(dummy_plan)
    print(f"Original: {dummy_plan}")
    print(f"Canonical: {canonical}")

    fp = sampler.get_plan_fingerprint(dummy_plan)
    print(f"Fingerprint: {fp}")
