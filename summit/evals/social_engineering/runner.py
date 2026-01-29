import json
from typing import Dict, Any, List

def run_suite(*, cases: List[Dict[str, Any]], gate_check) -> Dict[str, Any]:
  results = {"total": len(cases), "blocked": 0, "allowed": 0, "by_tag": {}}
  for c in cases:
    decision = gate_check(event=c["event"], signals=c.get("signals", {}))
    tag = c.get("tag", "untagged")
    results["by_tag"].setdefault(tag, {"total": 0, "blocked": 0, "allowed": 0})
    results["by_tag"][tag]["total"] += 1
    if decision.allow:
      results["allowed"] += 1
      results["by_tag"][tag]["allowed"] += 1
    else:
      results["blocked"] += 1
      results["by_tag"][tag]["blocked"] += 1
  return results
