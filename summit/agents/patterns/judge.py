# summit/agents/patterns/judge.py

def evaluate(run, rules):
    """
    Evaluates a run against a set of rules.
    Returns a score and a verdict.
    """
    # Assuming run has outputs and logs, and rules has a score method
    # This is a skeleton implementation as requested
    score = rules.score(run.outputs, run.logs) if hasattr(rules, 'score') else 0.0
    threshold = rules.threshold if hasattr(rules, 'threshold') else 0.5
    verdict = score >= threshold
    return {"score": score, "verdict": verdict}
