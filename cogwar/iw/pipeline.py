from __future__ import annotations

from pathlib import Path
from typing import Iterable
import json

from jsonschema import Draft202012Validator

from cogwar.iw.detectors.narrative_shift import detect_narrative_shift
from cogwar.iw.detectors.coordination import detect_coordination_anomalies

SCHEMA_PATH = Path("schemas/cogwar/iw_alert.schema.json")


def load_schema() -> dict:
    return json.loads(SCHEMA_PATH.read_text())


def validate_alerts(alerts: Iterable[dict]) -> list[dict]:
    schema = load_schema()
    validator = Draft202012Validator(schema)
    validated: list[dict] = []
    for alert in alerts:
        errors = sorted(validator.iter_errors(alert), key=lambda e: e.path)
        if errors:
            messages = "; ".join(error.message for error in errors)
            raise ValueError(f"IWAlert schema validation failed: {messages}")
        validated.append(alert)
    return validated


def run_iw_pipeline(timeseries: dict, graph_features: dict) -> list[dict]:
    alerts = []
    alerts.extend(detect_narrative_shift(timeseries))
    alerts.extend(detect_coordination_anomalies(graph_features))
    return validate_alerts(alerts)
