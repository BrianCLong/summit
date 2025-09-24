from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Dict, Iterable, List, Sequence, Tuple


@dataclass(frozen=True)
class IndicatorObservation:
    day: date
    count: float
    source: str


def _aggregate_daily_counts(
    observations: Iterable[IndicatorObservation],
    excluded_sources: Sequence[str] | None = None
) -> List[Tuple[date, float]]:
    exclude = set(excluded_sources or [])
    totals: Dict[date, float] = defaultdict(float)
    for observation in observations:
        if observation.source in exclude:
            continue
        totals[observation.day] += observation.count
    return sorted(totals.items())


def _exponential_smoothing(series: Sequence[float], alpha: float = 0.4) -> Tuple[List[float], float, float]:
    if not series:
        return [], 0.0, 0.0

    level = series[0]
    forecasts: List[float] = []
    residuals: List[float] = []

    for value in series:
        forecasts.append(level)
        residuals.append(value - level)
        level = alpha * value + (1 - alpha) * level

    mae = sum(abs(residual) for residual in residuals[1:]) / max(len(residuals) - 1, 1)
    return forecasts, mae, level


def _forecast_future(level: float, horizon: int) -> List[float]:
    return [level for _ in range(horizon)]


def forecast_indicator_trend(
    observations: Iterable[IndicatorObservation],
    horizon: int = 14,
    excluded_sources: Sequence[str] | None = None
) -> Dict[str, object]:
    daily_series = _aggregate_daily_counts(observations, excluded_sources)
    values = [value for _, value in daily_series]
    historical_forecasts, mae, level = _exponential_smoothing(values)
    future = _forecast_future(level, horizon)

    history = [
        {
            "date": day.isoformat(),
            "count": value,
            "fitted": fitted
        }
        for (day, value), fitted in zip(daily_series, historical_forecasts, strict=True)
    ]

    last_day = daily_series[-1][0] if daily_series else date.today()
    forecast_band = mae * 1.5
    forecast = [
        {
            "date": (last_day + timedelta(days=index + 1)).isoformat(),
            "forecast": value,
            "lower": max(0.0, value - forecast_band),
            "upper": value + forecast_band
        }
        for index, value in enumerate(future)
    ]

    return {
        "history": history,
        "forecast": forecast,
        "mae": mae,
        "excludedSources": list(excluded_sources or [])
    }


@dataclass(frozen=True)
class CommunityMetric:
    week_start: date
    sanctions_proximity: float
    infra_discoveries: float
    connectivity_growth: float


def _compute_risk_score(metric: CommunityMetric) -> float:
    return (
        0.5 * metric.sanctions_proximity
        + 0.3 * metric.infra_discoveries
        + 0.2 * metric.connectivity_growth
    )


def forecast_community_risk(
    metrics: Sequence[CommunityMetric],
    horizon_weeks: int = 4,
    removed_hubs: Sequence[str] | None = None
) -> Dict[str, object]:
    if not metrics:
        return {
            "baseline": [],
            "forecast": [],
            "whatIf": [],
            "mae": 0.0
        }

    baseline_scores = [_compute_risk_score(metric) for metric in metrics]
    _, mae, level = _exponential_smoothing(baseline_scores, alpha=0.35)
    forecast = _forecast_future(level, horizon_weeks)

    history = [
        {
            "week": metric.week_start.isoformat(),
            "score": score
        }
        for metric, score in zip(metrics, baseline_scores, strict=True)
    ]

    last_week = metrics[-1].week_start
    forecast_band = mae * 1.25
    future = [
        {
            "week": (last_week + timedelta(weeks=index + 1)).isoformat(),
            "forecast": value,
            "lower": max(0.0, value - forecast_band),
            "upper": value + forecast_band
        }
        for index, value in enumerate(forecast)
    ]

    removal_penalty = 0.15 * len(removed_hubs or [])
    adjusted_forecast = [max(0.0, value - removal_penalty) for value in forecast]
    what_if = [
        {
            "week": entry["week"],
            "forecast": adjusted,
            "delta": adjusted - entry["forecast"]
        }
        for entry, adjusted in zip(future, adjusted_forecast, strict=True)
    ]

    return {
        "baseline": history,
        "forecast": future,
        "whatIf": what_if,
        "mae": mae,
        "removedHubs": list(removed_hubs or [])
    }
