from __future__ import annotations


def normalize(metric: str, value: float, spec: dict[str, float | str]) -> float:
    min_value = float(spec["min"])
    max_value = float(spec["max"])
    direction = str(spec["direction"])
    if max_value <= min_value:
        raise ValueError(f"Invalid bounds for metric {metric}: {min_value}, {max_value}")

    clamped = max(min(value, max_value), min_value)
    if direction == "higher_is_better":
        return (clamped - min_value) / (max_value - min_value)
    if direction == "lower_is_better":
        return (max_value - clamped) / (max_value - min_value)
    raise ValueError(f"Unsupported direction for metric {metric}: {direction}")


def score_model(metrics: dict[str, float], schema: dict[str, dict[str, float | str]]) -> float:
    total = 0.0
    for metric_name, spec in schema.items():
        if metric_name not in metrics:
            raise ValueError(f"Missing required metric: {metric_name}")
        weight = float(spec["weight"])
        total += weight * normalize(metric_name, float(metrics[metric_name]), spec)
    return round(total, 6)
