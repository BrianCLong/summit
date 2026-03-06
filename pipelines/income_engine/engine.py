"""Deterministic Income Engine orchestration."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

import jsonschema

from .cost_model import total_cost
from .leverage import asset_leverage_index, simplicity_score
from .recurrence import recurrence_score
from .report import build_evidence_id, enforce_claim_policy, write_artifacts


SCHEMA_PATH = Path(__file__).with_name("income_model.schema.json")


@dataclass(frozen=True)
class IncomeEngine:
    """Income Engine runner with deterministic outputs."""

    feature_flag_env: str = "SUMMIT_ENABLE_INCOME_ENGINE"

    def _load_schema(self) -> dict:
        return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

    def validate_spec(self, spec: dict) -> None:
        jsonschema.validate(instance=spec, schema=self._load_schema())
        if "setup_cost" not in spec:
            raise ValueError("Cost disclosure is required.")
        if not spec.get("evidence_links"):
            raise ValueError("At least one evidence link is required.")

    def calculate_projection(self, spec: dict) -> dict:
        months = int(spec.get("projection_months", 12))
        monthly_revenue = (
            float(spec["monthly_traffic"]) * float(spec["conversion_rate"]) * float(spec["price"])
        )
        retained_monthly_revenue = monthly_revenue * (1 - float(spec["churn_rate"]))
        projected_revenue = retained_monthly_revenue * months
        costs = total_cost(spec)
        return {
            "projection_months": months,
            "monthly_revenue": round(monthly_revenue, 2),
            "retained_monthly_revenue": round(retained_monthly_revenue, 2),
            "projected_revenue": round(projected_revenue, 2),
            "projected_cost": costs,
            "projected_net": round(projected_revenue - costs, 2),
        }

    def run(self, spec: dict, output_dir: Path) -> tuple[dict, dict, dict]:
        enabled = os.getenv(self.feature_flag_env, "0") == "1"
        if not enabled:
            raise RuntimeError("Income Engine feature flag is disabled by default.")

        self.validate_spec(spec)
        enforce_claim_policy(spec.get("claims", []))

        projection = self.calculate_projection(spec)
        metrics = {
            "asset_leverage_index": asset_leverage_index(spec),
            "recurrence_score": recurrence_score(spec),
            "simplicity_score": simplicity_score(spec),
        }
        report = {
            "model_type": spec["model_type"],
            "assumptions": {
                "setup_cost": spec["setup_cost"],
                "monthly_operating_cost": spec.get("monthly_operating_cost", 0),
                "monthly_traffic": spec["monthly_traffic"],
                "conversion_rate": spec["conversion_rate"],
                "price": spec["price"],
                "churn_rate": spec["churn_rate"],
            },
            "projection": projection,
            "evidence_links": spec["evidence_links"],
        }
        evidence_id = build_evidence_id(spec, report)
        stamp = {
            "engine": "income_engine",
            "version": "0.1.0",
            "deterministic": True,
            "evidence_id": evidence_id,
        }
        report["evidence_id"] = evidence_id

        write_artifacts(output_dir, report, metrics, stamp)
        return report, metrics, stamp


def run_income_engine(spec: dict, output_dir: Path) -> tuple[dict, dict, dict]:
    """Convenience helper for callers."""
    return IncomeEngine().run(spec=spec, output_dir=output_dir)
