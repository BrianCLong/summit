# summit/supplychain/canary/canary_runner.py

import json
from typing import List, Dict, Any

class CanaryRunner:
    """
    Detects "selective update" patterns by comparing responses from multiple probes.
    """

    def __init__(self, probes):
        self.probes = probes

    def run_check(self, target_url: str) -> Dict[str, Any]:
        results = []
        for probe in self.probes:
            results.append(probe.probe(target_url))

        # Compare results
        if not results:
            return {"status": "error", "message": "No probes ran"}

        first = results[0]
        differential = False
        for r in results[1:]:
            if r["hash"] != first["hash"] or r["redirect_url"] != first["redirect_url"]:
                differential = True
                break

        return {
            "status": "fail" if differential else "pass",
            "differential_detected": differential,
            "probe_results": results
        }
