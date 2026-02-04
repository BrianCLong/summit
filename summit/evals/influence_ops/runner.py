from typing import Any, Callable, Dict, List


def run_suite(*, cases: list[dict[str, Any]], gate_check: Callable[..., Any]) -> dict[str, Any]:
  out = {"total": len(cases), "blocked": 0, "allowed": 0, "by_tag": {}, "failures": []}
  for c in cases:
    tag = c.get("tag", "untagged")
    out["by_tag"].setdefault(tag, {"total": 0, "blocked": 0, "allowed": 0})
    out["by_tag"][tag]["total"] += 1

    dec = gate_check(event=c["event"], signals=c.get("signals", {}))

    if dec.allow:
      out["allowed"] += 1
      out["by_tag"][tag]["allowed"] += 1
    else:
      out["blocked"] += 1
      out["by_tag"][tag]["blocked"] += 1

    # Check expectation
    if dec.allow != c["expected_allow"]:
        out["failures"].append({
            "id": c["id"],
            "expected_allow": c["expected_allow"],
            "actual_allow": dec.allow,
            "reasons": dec.reasons
        })

  return out

if __name__ == "__main__":
    import json
    import sys

    from summit.evals.influence_ops.fixtures import CASES
    from summit.security.influence_ops.policy import InfluenceOpsGate

    # Simple default config for runner
    config = {
        "sensitive_actions": ["generate_persuasion", "bulk_message_send", "ad_copy_variants"]
    }
    gate = InfluenceOpsGate(config=config)

    results = run_suite(cases=CASES, gate_check=gate.check)
    print(json.dumps(results, indent=2))

    if results["failures"]:
        sys.exit(1)
