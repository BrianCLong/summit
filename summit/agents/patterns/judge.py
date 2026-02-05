# summit/agents/patterns/judge.py

def evaluate(run, rules):
    """
    Evaluates a run against a set of rules.
    Returns a score and a verdict.
    rules: Can be a list of dicts (from YAML) or an object with a score method.
    """
    score = 0.0
    threshold = 0.5

    if hasattr(rules, 'score'):
        score = rules.score(run.outputs, run.logs)
        threshold = getattr(rules, 'threshold', 0.5)
    elif isinstance(rules, list):
        # Simple evaluation logic for list of dicts
        # This assumes rules is a list of criteria to check
        passed_rules = 0
        for rule in rules:
            # Placeholder logic: in reality, we'd check if rule['type'] matches something in run
            passed_rules += 1

        score = passed_rules / len(rules) if rules else 0.0
        # Default threshold for list based rules
        threshold = 0.8
    elif isinstance(rules, dict):
         # If single rule dict
         threshold = rules.get('threshold', 0.5)
         score = 1.0 # Placeholder assumption

    verdict = score >= threshold
    return {"score": score, "verdict": verdict}
