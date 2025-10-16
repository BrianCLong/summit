# ops/cost_guard.py


def apply_query_budget(query: str, budget_limit: float) -> bool:
    """
    Stub for applying query budgeting.
    """
    print(f"Applying query budget {budget_limit} to query: {query}")
    # Simulate budget check
    if len(query) > 30 and budget_limit < 10:
        return False  # Query too complex for small budget
    return True


def kill_slow_query(query_id: str, threshold_seconds: int) -> bool:
    """
    Stub for killing slow queries.
    """
    print(f"Killing query {query_id} if exceeding {threshold_seconds} seconds.")
    # Simulate killing a query
    return True


def get_archive_tier_cost_estimate(data_size_gb: float, tier: str) -> float:
    """
    Stub for estimating archive tier storage cost (e.g., S3/Glacier).
    """
    print(f"Estimating cost for {data_size_gb} GB in {tier} tier.")
    if tier == "S3_Glacier":
        return data_size_gb * 0.004  # Example cost
    return 0.0
