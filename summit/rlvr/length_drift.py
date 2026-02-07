from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Sequence


def _mean(values: Sequence[float]) -> float:
    if not values:
        raise ValueError("values must be non-empty")
    return sum(values) / len(values)


def _percentile(sorted_values: Sequence[float], percentile: float) -> float:
    if not sorted_values:
        raise ValueError("values must be non-empty")
    if not 0 <= percentile <= 1:
        raise ValueError("percentile must be between 0 and 1")
    if len(sorted_values) == 1:
        return float(sorted_values[0])
    position = percentile * (len(sorted_values) - 1)
    lower = int(position)
    upper = min(lower + 1, len(sorted_values) - 1)
    weight = position - lower
    return (sorted_values[lower] * (1 - weight)) + (sorted_values[upper] * weight)


def _linear_regression_slope(xs: Sequence[float], ys: Sequence[float]) -> float:
    if len(xs) != len(ys) or not xs:
        raise ValueError("xs and ys must be the same non-empty length")
    if len(xs) == 1:
        return 0.0
    x_mean = _mean(xs)
    y_mean = _mean(ys)
    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys))
    denominator = sum((x - x_mean) ** 2 for x in xs)
    if denominator == 0:
        return 0.0
    return numerator / denominator


@dataclass(frozen=True)
class LengthDriftResult:
    mean_length: float
    p50: float
    p95: float
    min_length: int
    max_length: int
    slope: float
    drop_pct: float
    collapse: bool
    overlong_ratio: float
    overlong_flag: bool


def length_histogram(lengths: Iterable[int], *, bin_size: int = 10) -> dict[str, int]:
    if bin_size <= 0:
        raise ValueError("bin_size must be positive")
    histogram: dict[str, int] = {}
    for value in lengths:
        if value < 0:
            raise ValueError("lengths must be non-negative")
        bucket_start = (value // bin_size) * bin_size
        bucket_label = f"{bucket_start}-{bucket_start + bin_size - 1}"
        histogram[bucket_label] = histogram.get(bucket_label, 0) + 1
    return histogram


def detect_length_gaming(
    lengths: Sequence[int],
    *,
    max_len: int | None,
    overlong_ratio_threshold: float,
) -> tuple[float, bool]:
    if not lengths:
        raise ValueError("lengths must be non-empty")
    if max_len is None:
        return 0.0, False
    if max_len <= 0:
        raise ValueError("max_len must be positive")
    if not 0 <= overlong_ratio_threshold <= 1:
        raise ValueError("overlong_ratio_threshold must be between 0 and 1")
    overlong = sum(1 for length in lengths if length > max_len)
    ratio = overlong / len(lengths)
    return ratio, ratio > overlong_ratio_threshold


def detect_length_collapse(
    lengths: Sequence[int],
    *,
    steps: Sequence[int] | None = None,
    window: int = 10,
    slope_threshold: float = -0.1,
    drop_threshold: float = 0.2,
    max_len: int | None = None,
    overlong_ratio_threshold: float = 0.1,
) -> LengthDriftResult:
    if not lengths:
        raise ValueError("lengths must be non-empty")
    if window <= 0:
        raise ValueError("window must be positive")
    if not 0 <= drop_threshold <= 1:
        raise ValueError("drop_threshold must be between 0 and 1")
    if steps is None:
        steps = list(range(len(lengths)))
    if len(steps) != len(lengths):
        raise ValueError("steps must match lengths")

    sorted_lengths = sorted(lengths)
    mean_length = _mean([float(v) for v in lengths])
    p50 = _percentile(sorted_lengths, 0.5)
    p95 = _percentile(sorted_lengths, 0.95)
    min_length = min(lengths)
    max_length = max(lengths)

    slope = _linear_regression_slope([float(x) for x in steps], [float(y) for y in lengths])

    start_window = lengths[:window] if len(lengths) >= window else lengths
    end_window = lengths[-window:] if len(lengths) >= window else lengths
    start_mean = _mean([float(v) for v in start_window])
    end_mean = _mean([float(v) for v in end_window])
    drop_pct = (start_mean - end_mean) / start_mean if start_mean > 0 else 0.0

    collapse = slope < slope_threshold and drop_pct >= drop_threshold

    overlong_ratio, overlong_flag = detect_length_gaming(
        lengths,
        max_len=max_len,
        overlong_ratio_threshold=overlong_ratio_threshold,
    )

    return LengthDriftResult(
        mean_length=mean_length,
        p50=p50,
        p95=p95,
        min_length=min_length,
        max_length=max_length,
        slope=slope,
        drop_pct=drop_pct,
        collapse=collapse,
        overlong_ratio=overlong_ratio,
        overlong_flag=overlong_flag,
    )
