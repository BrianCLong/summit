from summit.schemas.explanation import ExplainMetrics

def compute_trust_score(metrics: ExplainMetrics) -> int:
    """
    Compute a simple trust score (0-100) based on maintainability metrics.
    Lower complexity, fewer functions, and reasonable LOC yield higher scores.
    """
    if metrics.cyclomatic_complexity < 0:
        return 0 # Error case

    score = 100

    # Penalize high cyclomatic complexity
    if metrics.cyclomatic_complexity > 10:
        score -= min(30, (metrics.cyclomatic_complexity - 10) * 2)

    # Penalize excessive function count
    if metrics.function_count > 20:
        score -= min(20, (metrics.function_count - 20))

    # Penalize giant files
    if metrics.loc > 500:
        score -= min(30, (metrics.loc - 500) // 10)

    return max(0, score)
