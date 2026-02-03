import statistics


def robust_aggregate(updates: list[float], method: str = "median", trim_ratio: float = 0.1) -> float:
    """
    Aggregates a list of scalar updates using robust methods.

    Args:
        updates: List of float values (e.g., gradient norms or specific weight parameters).
        method: "median" or "trimmed_mean".
        trim_ratio: Fraction to trim from each end for trimmed_mean (0.0 to 0.5).

    Returns:
        Aggregated value.
    """
    if not updates:
        return 0.0

    sorted_updates = sorted(updates)
    n = len(updates)

    if method == "median":
        return statistics.median(sorted_updates)

    elif method == "trimmed_mean":
        if n < 3:
            return statistics.mean(updates)

        k = int(n * trim_ratio)
        # Ensure we don't trim everything
        if k >= n / 2:
            k = int((n - 1) / 2)

        trimmed = sorted_updates[k : n - k]
        if not trimmed: # Should not happen with check above
            return statistics.mean(updates)
        return statistics.mean(trimmed)

    else:
        raise ValueError(f"Unknown method: {method}")
