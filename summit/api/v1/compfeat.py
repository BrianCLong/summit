from summit.policy.compfeat_policy import evaluate_compfeat

def post_compfeat(actor: dict, payload: dict, flags: dict) -> dict:
  decision = evaluate_compfeat(actor=actor, request=payload, flags=flags)
  if not decision.allowed:
    return {"ok": False, "error": "forbidden", "reason": decision.reason}
  # Engine is wired in PR3; return placeholder for now.
  return {"ok": True, "result": {"status": "stub"}}
