"""Consent Drift Forecaster (CDF).

Provides a lightweight state-space forecaster with changepoint controls for
consent-rate trajectories. The module operates on basic Python data
structures so it can run in constrained environments while still emitting
forecasts, simulations, and a signed planning brief.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from itertools import groupby
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple
import hashlib

import numpy as np


@dataclass(frozen=True)
class Scenario:
  """Configuration for a mitigation scenario."""

  name: str
  sampling_factor: float = 1.0
  minimal_view_penalty: float = 0.0
  cadence_modifier: float = 1.0
  variability: float = 0.0


@dataclass(frozen=True)
class CDFConfig:
  """Hyper-parameters for the consent drift forecaster."""

  changepoint_threshold: float = 0.035
  max_changepoints: int = 4
  changepoint_scale: float = 2.5
  process_noise_level: float = 0.0004
  measurement_noise_level: float = 0.0009
  coverage_baseline: float = 0.85
  dp_budget_per_million: float = 1.3
  kpi_weights: Dict[str, float] = field(
      default_factory=lambda: {"coverage": 0.6, "dp": 0.3, "minimal_view": 0.1}
  )
  signature_salt: str = "cdf-v1"
  seed: int = 1234


@dataclass(frozen=True)
class PlanningBrief:
  """Structured planning brief emitted by the forecaster."""

  text: str
  signature: str


@dataclass(frozen=True)
class ConsentRecord:
  date: datetime
  cohort: str
  region: str
  consent_rate: float
  population: float


class ConsentDriftForecaster:
  """State-space forecaster with changepoint aware uncertainty control."""

  def __init__(
      self,
      config: Optional[CDFConfig] = None,
      scenarios: Optional[Sequence[Scenario]] = None,
  ) -> None:
    self.config = config or CDFConfig()
    self.scenarios: Tuple[Scenario, ...] = tuple(
        scenarios
        if scenarios is not None
        else (
            Scenario("base"),
            Scenario("sampling", sampling_factor=0.92),
            Scenario("minimal-view", minimal_view_penalty=0.05),
            Scenario("cadence", cadence_modifier=1.15),
        )
    )
    self._fitted: Dict[Tuple[str, str], Dict[str, Any]] = {}
    self._history: List[ConsentRecord] = []

  # ---------------------------------------------------------------------------
  # Public API
  # ---------------------------------------------------------------------------
  def fit(self, records: Iterable[Any]) -> None:
    """Fit state-space models for each cohort/region combination."""
    normalized = self._normalize_records(records)
    if not normalized:
      raise ValueError("No consent records supplied to fit().")

    normalized.sort(key=lambda rec: (rec.cohort, rec.region, rec.date))
    self._history = list(normalized)
    self._fitted.clear()

    for (cohort, region), group_iter in groupby(normalized, key=lambda rec: (rec.cohort, rec.region)):
      group = list(group_iter)
      series = np.array([rec.consent_rate for rec in group], dtype=float)
      changepoints = self._detect_changepoints(series)
      states, Q, R = self._fit_series(series, changepoints)
      offset = self._infer_offset([rec.date for rec in group])
      self._fitted[(cohort, region)] = {
          "states": states,
          "changepoints": changepoints,
          "Q": Q,
          "R": R,
          "last_state": states[-1][0],
          "last_cov": states[-1][1],
          "dates": [rec.date for rec in group],
          "offset": offset,
          "population": float(group[-1].population),
      }

  def forecast(self, horizon: int, seed: Optional[int] = None) -> List[Dict[str, Any]]:
    if not self._fitted:
      raise RuntimeError("Forecaster must be fitted before forecasting.")
    if horizon <= 0:
      raise ValueError("Forecast horizon must be positive.")

    rows: List[Dict[str, Any]] = []
    rng = np.random.default_rng(seed if seed is not None else self.config.seed)
    for (cohort, region), meta in self._fitted.items():
      state_mean = meta["last_state"].copy()
      state_cov = meta["last_cov"].copy()
      offset: timedelta = meta["offset"]
      last_date: datetime = meta["dates"][-1]
      Q = meta["Q"]
      R = meta["R"]

      for step in range(1, horizon + 1):
        state_mean, state_cov, obs_mean, obs_std = self._forecast_step(
            state_mean, state_cov, Q, R
        )
        future_date = self._advance_date(last_date, offset, step)
        interval_scale = 1.96
        rows.append(
            {
                "cohort": cohort,
                "region": region,
                "date": future_date,
                "forecast": float(obs_mean),
                "lower": float(max(0.0, obs_mean - interval_scale * obs_std)),
                "upper": float(min(1.0, obs_mean + interval_scale * obs_std)),
                "simulation_draw": float(rng.uniform()),
            }
        )

    rows.sort(key=lambda row: (row["cohort"], row["region"], row["date"]))
    return rows

  def backtest(
      self, records: Optional[Iterable[Any]] = None, horizon: int = 2
  ) -> Dict[str, Any]:
    if records is None:
      if not self._history:
        raise RuntimeError("No training history available for backtest().")
      history = list(self._history)
    else:
      history = self._normalize_records(records)
    history.sort(key=lambda rec: (rec.cohort, rec.region, rec.date))

    mape_by_group: Dict[Tuple[str, str], float] = {}
    aggregate_errors: List[float] = []

    for (cohort, region), group_iter in groupby(history, key=lambda rec: (rec.cohort, rec.region)):
      group = list(group_iter)
      if len(group) <= horizon:
        continue
      train = group[:-horizon]
      test = group[-horizon:]
      series_train = np.array([rec.consent_rate for rec in train], dtype=float)
      series_test = np.array([rec.consent_rate for rec in test], dtype=float)
      changepoints = self._detect_changepoints(series_train)
      states, Q, R = self._fit_series(series_train, changepoints)
      last_state = states[-1][0]
      last_cov = states[-1][1]
      forecasts = self._forecast_path(last_state, last_cov, Q, R, horizon)
      preds = np.array(forecasts["mean"])
      epsilon = np.clip(np.abs(series_test), 1e-3, None)
      mape = float(np.mean(np.abs(series_test - preds) / epsilon))
      mape_by_group[(cohort, region)] = mape
      aggregate_errors.append(mape)

    global_mape = float(np.mean(aggregate_errors)) if aggregate_errors else float("nan")
    return {"global_mape": global_mape, "mape_by_group": mape_by_group}

  def simulate_impacts(
      self,
      forecast_rows: Iterable[Mapping[str, Any]],
      seed: Optional[int] = None,
  ) -> List[Dict[str, Any]]:
    if not self._fitted:
      raise RuntimeError("Forecaster must be fitted before simulation.")

    forecast_list = [dict(row) for row in forecast_rows]
    forecast_list.sort(key=lambda row: (row["cohort"], row["region"], row["date"]))
    grouped: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
    for row in forecast_list:
      key = (row["cohort"], row["region"])
      grouped.setdefault(key, []).append(row)

    rng = np.random.default_rng(seed if seed is not None else self.config.seed)
    rows: List[Dict[str, Any]] = []

    for scenario in self.scenarios:
      for (cohort, region), group in grouped.items():
        population = float(self._fitted[(cohort, region)]["population"])
        for row in group:
          rate = float(np.clip(row["forecast"], 0.0, 1.0))
          jitter = rng.normal(0.0, scenario.variability) if scenario.variability else 0.0
          adjusted_rate = float(np.clip(rate + jitter, 0.0, 1.0))
          consenting_users = population * adjusted_rate
          expected_coverage = (
              self.config.coverage_baseline
              * scenario.sampling_factor
              * adjusted_rate
          )
          dp_budget = (
              self.config.dp_budget_per_million
              * (consenting_users / 1_000_000.0)
              * scenario.cadence_modifier
          )
          kpi = (
              self.config.kpi_weights.get("coverage", 0.0) * expected_coverage
              - self.config.kpi_weights.get("dp", 0.0) * dp_budget
              - self.config.kpi_weights.get("minimal_view", 0.0)
              * scenario.minimal_view_penalty
          )
          rows.append(
              {
                  "scenario": scenario.name,
                  "date": row["date"],
                  "cohort": cohort,
                  "region": region,
                  "expected_coverage": expected_coverage,
                  "dp_budget_millions": dp_budget,
                  "kpi_score": kpi,
              }
          )

    rows.sort(key=lambda row: (row["scenario"], row["cohort"], row["region"], row["date"]))
    return rows

  def generate_planning_brief(
      self,
      forecast_rows: Iterable[Mapping[str, Any]],
      impacts_rows: Iterable[Mapping[str, Any]],
      seed: Optional[int] = None,
  ) -> PlanningBrief:
    forecast_list = [dict(row) for row in forecast_rows]
    impacts_list = [dict(row) for row in impacts_rows]
    if not forecast_list or not impacts_list:
      raise ValueError("Forecast and impact data are required for planning brief generation.")

    forecast_list.sort(key=lambda row: row["date"])
    start = forecast_list[0]["date"].date()
    end = forecast_list[-1]["date"].date()

    summary_lines: List[str] = [
        "Consent Drift Forecaster Planning Brief",
        f"Forecast horizon covers {start.isoformat()} to {end.isoformat()}.",
    ]

    scenario_summary: Dict[str, Dict[str, float]] = {}
    for row in impacts_list:
      stats = scenario_summary.setdefault(
          row["scenario"], {"coverage": [], "dp": [], "kpi": []}
      )
      stats["coverage"].append(row["expected_coverage"])
      stats["dp"].append(row["dp_budget_millions"])
      stats["kpi"].append(row["kpi_score"])

    for scenario, stats in sorted(scenario_summary.items()):
      coverage = float(np.mean(stats["coverage"]))
      dp_budget = float(np.mean(stats["dp"]))
      kpi = float(np.mean(stats["kpi"]))
      summary_lines.append(
          f"- {scenario.title()}: coverage {coverage:.2%}, DP budget ${dp_budget:.3f}M, KPI {kpi:.3f}."
      )

    base_impacts = [row for row in impacts_list if row["scenario"] == "base"]
    if base_impacts:
      base_impacts.sort(key=lambda row: row["expected_coverage"])
      summary_lines.append("Risk outlook:")
      for row in base_impacts[:2]:
        summary_lines.append(
            f"  • {row['cohort']}/{row['region']} coverage dips to {row['expected_coverage']:.2%}."
        )
    else:
      summary_lines.append("Risk outlook: no base scenario impacts available.")

    summary_lines.append("Mitigation levers stress-tested: sampling, minimal-view, cadence.")
    rng = np.random.default_rng(seed if seed is not None else self.config.seed)
    note_options = (
        "Recommend pre-emptive sampling guardrails.",
        "Minimal-view fallback remains optional at this horizon.",
        "Cadence adjustment reserves capacity for DP budget shocks.",
    )
    summary_lines.append(f"Analyst note: {rng.choice(note_options)}")

    digest_input = self.config.signature_salt + "|" + "|".join(summary_lines)
    signature = hashlib.sha256(digest_input.encode("utf-8")).hexdigest()
    return PlanningBrief("\n".join(summary_lines), signature)

  # ---------------------------------------------------------------------------
  # Internal helpers
  # ---------------------------------------------------------------------------
  def _normalize_records(self, records: Iterable[Any]) -> List[ConsentRecord]:
    normalized: List[ConsentRecord] = []
    for record in records:
      if isinstance(record, ConsentRecord):
        normalized.append(record)
        continue
      if isinstance(record, Mapping):
        normalized.append(
            ConsentRecord(
                date=self._coerce_datetime(record.get("date")),
                cohort=str(record.get("cohort")),
                region=str(record.get("region")),
                consent_rate=float(record.get("consent_rate")),
                population=float(record.get("population")),
            )
        )
        continue
      raise TypeError("Records must be mappings or ConsentRecord instances.")
    return normalized

  def _coerce_datetime(self, value: Any) -> datetime:
    if isinstance(value, datetime):
      return value
    if isinstance(value, str):
      return datetime.fromisoformat(value)
    if hasattr(value, "item"):
      extracted = value.item()
      if isinstance(extracted, datetime):
        return extracted
      if isinstance(extracted, str):
        return datetime.fromisoformat(extracted)
    raise TypeError(f"Unsupported date value: {value!r}")

  def _detect_changepoints(self, series: np.ndarray) -> Tuple[int, ...]:
    if series.size < 3:
      return tuple()
    diffs = np.diff(series)
    threshold = self.config.changepoint_threshold
    candidate_idx = np.where(np.abs(diffs) >= threshold)[0] + 1
    if candidate_idx.size == 0:
      return tuple()
    magnitudes = np.abs(diffs[candidate_idx - 1])
    order = np.argsort(magnitudes)[::-1]
    limited = candidate_idx[order][: self.config.max_changepoints]
    return tuple(int(idx) for idx in np.sort(limited))

  def _fit_series(
      self, series: np.ndarray, changepoints: Tuple[int, ...]
  ) -> Tuple[List[Tuple[np.ndarray, np.ndarray]], np.ndarray, float]:
    level_var = max(
        self.config.process_noise_level,
        float(np.var(np.diff(series)) * 0.25) if series.size > 1 else self.config.process_noise_level,
    )
    trend_var = level_var / 3.0
    meas_var = max(
        self.config.measurement_noise_level,
        float(np.var(series) * 0.05),
    )
    Q = np.array([[level_var, 0.0], [0.0, trend_var]])
    R = meas_var + 1e-6
    states = self._run_filter(series, changepoints, Q, R)
    return states, Q, R

  def _run_filter(
      self,
      series: np.ndarray,
      changepoints: Tuple[int, ...],
      Q: np.ndarray,
      R: float,
  ) -> List[Tuple[np.ndarray, np.ndarray]]:
    F = np.array([[1.0, 1.0], [0.0, 1.0]])
    H = np.array([1.0, 0.0])
    state_mean = np.array([series[0], 0.0])
    state_cov = np.eye(2) * 0.05
    stored: List[Tuple[np.ndarray, np.ndarray]] = []

    for idx, value in enumerate(series):
      if idx > 0:
        state_mean = F @ state_mean
        state_cov = F @ state_cov @ F.T + Q
      if idx in changepoints:
        state_cov += np.eye(2) * self.config.changepoint_scale
      innovation = value - H @ state_mean
      S = float(H @ state_cov @ H.T + R)
      K = (state_cov @ H) / S
      state_mean = state_mean + K * innovation
      state_cov = (np.eye(2) - np.outer(K, H)) @ state_cov
      stored.append((state_mean.copy(), state_cov.copy()))
    return stored

  def _forecast_step(
      self,
      state_mean: np.ndarray,
      state_cov: np.ndarray,
      Q: np.ndarray,
      R: float,
  ) -> Tuple[np.ndarray, np.ndarray, float, float]:
    F = np.array([[1.0, 1.0], [0.0, 1.0]])
    H = np.array([1.0, 0.0])
    state_mean = F @ state_mean
    state_cov = F @ state_cov @ F.T + Q
    obs_mean = float(H @ state_mean)
    obs_var = float(H @ state_cov @ H.T + R)
    obs_std = float(np.sqrt(max(obs_var, 1e-9)))
    return state_mean, state_cov, obs_mean, obs_std

  def _forecast_path(
      self,
      state_mean: np.ndarray,
      state_cov: np.ndarray,
      Q: np.ndarray,
      R: float,
      horizon: int,
  ) -> Dict[str, List[float]]:
    means: List[float] = []
    lowers: List[float] = []
    uppers: List[float] = []
    for _ in range(horizon):
      state_mean, state_cov, obs_mean, obs_std = self._forecast_step(state_mean, state_cov, Q, R)
      means.append(obs_mean)
      lowers.append(max(0.0, obs_mean - 1.96 * obs_std))
      uppers.append(min(1.0, obs_mean + 1.96 * obs_std))
    return {"mean": means, "lower": lowers, "upper": uppers}

  def _infer_offset(self, dates: List[datetime]) -> timedelta:
    if len(dates) >= 2:
      diffs = [dates[idx] - dates[idx - 1] for idx in range(1, len(dates))]
      total = sum(diffs, timedelta())
      average = total / len(diffs)
      if average.total_seconds() > 0:
        return average
    return timedelta(days=30)

  def _advance_date(self, reference: datetime, offset: timedelta, step: int) -> datetime:
    return reference + offset * step


__all__ = [
    "CDFConfig",
    "ConsentDriftForecaster",
    "PlanningBrief",
    "Scenario",
    "ConsentRecord",
]
