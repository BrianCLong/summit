import json
from datetime import datetime
from pathlib import Path
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
  sys.path.insert(0, str(ROOT))

from cdf import CDFConfig, ConsentDriftForecaster


FIXTURE_PATH = Path(__file__).with_name("golden_impacts.json")


def build_fixture_records():
  dates = [datetime(2024, month, 1) for month in range(1, 13)]
  cohorts = ["alpha", "beta"]
  regions = ["NA", "EU"]
  populations = {"alpha": 1_200_000, "beta": 950_000}

  noise_map = {
      ("alpha", "NA"): np.linspace(-0.004, 0.003, len(dates)),
      ("alpha", "EU"): np.linspace(0.002, -0.003, len(dates)),
      ("beta", "NA"): np.linspace(0.001, -0.002, len(dates)),
      ("beta", "EU"): np.linspace(-0.003, 0.002, len(dates)),
  }

  records = []
  for cohort in cohorts:
    for region in regions:
      base = 0.72 if cohort == "alpha" else 0.75
      trend = 0.005 if region == "NA" else 0.003
      for idx, date in enumerate(dates):
        value = base + trend * idx + noise_map[(cohort, region)][idx]
        if cohort == "alpha" and region == "NA" and idx >= 6:
          value += 0.045
        if cohort == "alpha" and region == "EU" and idx >= 7:
          value -= 0.05
        if cohort == "beta" and region == "NA" and idx >= 8:
          value -= 0.025
        if cohort == "beta" and region == "EU" and idx >= 5:
          value += 0.035
        records.append(
            {
                "date": date.isoformat(),
                "cohort": cohort,
                "region": region,
                "consent_rate": float(np.clip(value, 0.4, 0.95)),
                "population": populations[cohort],
            }
        )
  records.sort(key=lambda item: (item["cohort"], item["region"], item["date"]))
  return records


def _round_records(records):
  rounded = []
  for item in records:
    rounded.append(
        {
            **item,
            "date": item["date"].isoformat() if isinstance(item["date"], datetime) else item["date"],
            "expected_coverage": round(item.get("expected_coverage", 0.0), 6)
            if "expected_coverage" in item
            else item.get("expected_coverage"),
            "dp_budget_millions": round(item.get("dp_budget_millions", 0.0), 6)
            if "dp_budget_millions" in item
            else item.get("dp_budget_millions"),
            "kpi_score": round(item.get("kpi_score", 0.0), 6)
            if "kpi_score" in item
            else item.get("kpi_score"),
            "forecast": round(item.get("forecast", 0.0), 6)
            if "forecast" in item
            else item.get("forecast"),
            "lower": round(item.get("lower", 0.0), 6)
            if "lower" in item
            else item.get("lower"),
            "upper": round(item.get("upper", 0.0), 6)
            if "upper" in item
            else item.get("upper"),
        }
    )
  return rounded


def test_backtest_hits_mape_target():
  records = build_fixture_records()
  forecaster = ConsentDriftForecaster(CDFConfig(seed=2025))
  forecaster.fit(records)
  scores = forecaster.backtest(horizon=2)
  assert scores["global_mape"] < 0.06
  assert all(value < 0.075 for value in scores["mape_by_group"].values())


def test_simulated_impacts_match_golden_snapshot():
  records = build_fixture_records()
  forecaster = ConsentDriftForecaster(CDFConfig(seed=2025))
  forecaster.fit(records)
  forecast = forecaster.forecast(horizon=3, seed=2025)
  impacts = forecaster.simulate_impacts(forecast, seed=2025)

  with FIXTURE_PATH.open() as fh:
    expected = json.load(fh)

  actual = [
      {
          **row,
          "date": row["date"].isoformat(),
          "expected_coverage": round(row["expected_coverage"], 6),
          "dp_budget_millions": round(row["dp_budget_millions"], 6),
          "kpi_score": round(row["kpi_score"], 6),
      }
      for row in impacts
  ]

  assert actual == expected


def test_seed_control_keeps_paths_identical():
  records = build_fixture_records()
  forecaster = ConsentDriftForecaster(CDFConfig(seed=303))
  forecaster.fit(records)

  forecast_a = forecaster.forecast(horizon=4, seed=303)
  impacts_a = forecaster.simulate_impacts(forecast_a, seed=303)
  brief_a = forecaster.generate_planning_brief(forecast_a, impacts_a, seed=303)

  forecast_b = forecaster.forecast(horizon=4, seed=303)
  impacts_b = forecaster.simulate_impacts(forecast_b, seed=303)
  brief_b = forecaster.generate_planning_brief(forecast_b, impacts_b, seed=303)

  assert _round_records(forecast_a) == _round_records(forecast_b)
  assert _round_records(impacts_a) == _round_records(impacts_b)
  assert brief_a.text == brief_b.text
  assert brief_a.signature == brief_b.signature
