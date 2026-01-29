from typing import List, Dict

ALLOWED_NEXT_STEPS = {
  "monitor",
  "collect_more_context",
  "escalate_to_comms",
  "escalate_to_security",
  "request_fact_check",
  "prepare_executive_briefing",
  "report_to_platform",
  "engage_legal_review"
}

def recommend_next_steps(drivers: List[str], context: Dict) -> List[str]:
    # Deterministic mapping; no LLM.
    steps: List[str] = ["monitor"]
    if any("automation" in d or "coordination" in d for d in drivers):
        steps.append("escalate_to_security")
    if any("toxicity" in d or "hate" in d for d in drivers):
        steps.append("escalate_to_comms")
    return [s for s in steps if s in ALLOWED_NEXT_STEPS]
