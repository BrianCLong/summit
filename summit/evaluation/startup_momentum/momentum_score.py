"""
Momentum Scoring Module
Deterministic scoring for founder ideas based on:
- Problem clarity
- Customer proximity
- Execution feasibility
- Focus
- Psychological readiness
- Market relevance
"""

# TODO: implement semantic analysis functions
def problem_clarity_score(problem_text: str) -> float:
    """
    Returns a score 0-1 representing clarity of problem articulation.
    TODO: Implement NLP-based scoring
    """
    return 0.0

def customer_proximity_score(interviews: list) -> float:
    """
    Returns 0-1 based on number and quality of validated customer interviews
    TODO: Compute score based on actual contacts
    """
    return 0.0

def execution_feasibility_score(problem_text: str) -> float:
    """
    Returns 0-1 feasibility score for MVP/prototype
    """
    return 0.0

def focus_score(task_list: list) -> float:
    """0-1 score based on founder focus/avoidance of multi-tasking"""
    return 0.0

def psych_readiness_score(founder_self_report: dict) -> float:
    """0-1 score for psychological readiness"""
    return 0.0

def market_relevance_score(problem_text: str) -> float:
    """0-1 score based on urgency/pain magnitude"""
    return 0.0

def compute_momentum_score(problem_text, interviews, task_list, founder_self_report):
    """Aggregate weighted momentum score"""
    return (
        0.25 * problem_clarity_score(problem_text) +
        0.25 * customer_proximity_score(interviews) +
        0.15 * execution_feasibility_score(problem_text) +
        0.15 * focus_score(task_list) +
        0.10 * psych_readiness_score(founder_self_report) +
        0.10 * market_relevance_score(problem_text)
    )
