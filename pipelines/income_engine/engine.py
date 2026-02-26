"""Income engine orchestrator."""

import json
from pathlib import Path

import yaml
from jsonschema import Draft7Validator

from .cost_model import calculate_projection
from .leverage import asset_leverage_index, simplicity_score
from .recurrence import recurrence_score
from .report import emit_artifacts

FEATURE_FLAG = "income_engine_enabled"


class IncomeEngineError(Exception):
    """Raised when engine input is invalid or policy-gated."""


def _load_schema(schema_path: Path) -> dict:
    return json.loads(schema_path.read_text(encoding="utf-8"))


def load_spec(spec_path: Path) -> dict:
    with open(spec_path, encoding="utf-8") as handle:
        if spec_path.suffix in {".yaml", ".yml"}:
            return yaml.safe_load(handle)
        if spec_path.suffix == ".json":
            return json.load(handle)
    raise IncomeEngineError(f"Unsupported spec format: {spec_path}")


def validate_spec(spec: dict, schema_path: Path) -> None:
    schema = _load_schema(schema_path)
    validator = Draft7Validator(schema)
    errors = sorted(validator.iter_errors(spec), key=lambda err: list(err.path))
    if errors:
        first = errors[0]
        raise IncomeEngineError(f"Invalid income spec at {list(first.path)}: {first.message}")


def run_income_engine(
    spec: dict,
    output_dir: Path,
    schema_path: Path,
    feature_flags: dict[str, bool] | None = None,
    run_date: str | None = None,
) -> dict[str, Path]:
    """Run full deterministic model and write report/metrics/stamp."""
    feature_flags = feature_flags or {}
    if not feature_flags.get(FEATURE_FLAG, False):
        raise IncomeEngineError("Income engine feature flag is disabled by default.")

    validate_spec(spec, schema_path=schema_path)

    if not spec.get("evidence_links"):
        raise IncomeEngineError("Projections must include evidence_links.")

    projection = calculate_projection(spec)
    metrics = {
        "asset_leverage_index": asset_leverage_index(
            spec.get("automation_share", 0.5),
            spec["setup_cost"],
            spec["monthly_operating_cost"],
        ),
        "recurrence_score": recurrence_score(spec["churn_rate"], spec["conversion_rate"]),
        "simplicity_score": simplicity_score(
            required_fields_count=len(spec.keys()),
            manual_hours_per_month=spec.get("manual_hours_per_month", 0),
        ),
    }

    return emit_artifacts(
        output_dir=output_dir,
        spec=spec,
        projection=projection,
        metrics=metrics,
        claims_allowed=True,
        run_date=run_date,
    )
