# summit/supplychain/canary/canary_runner.py
from typing import Dict, List, Any

class CanaryRunner:
    def __init__(self, providers: List[Any]):
        self.providers = providers

    def run_check(self, target_url: str) -> Dict[str, Any]:
        results = {}
        for provider in self.providers:
            results[provider.name] = provider.probe(target_url)

        # Detect differentials
        if not results:
            return {"status": "skipped", "reason": "no providers"}

        first_res = list(results.values())[0]
        differential_detected = False
        for res in results.values():
            if res != first_res:
                differential_detected = True
                break

        return {
            "target": target_url,
            "results": results,
            "differential_detected": differential_detected
        }
