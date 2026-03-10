from summit.evaluation.startup_momentum.momentum_score import compute_momentum_score as _compute_momentum_score

def compute_momentum_score(problem_text, interviews, task_list, founder_self_report):
    """Aggregate weighted momentum score"""
    return _compute_momentum_score(problem_text, interviews, task_list, founder_self_report)
