from __future__ import annotations

from ..evidence.emit import emit


def record_metric(name: str, value: int = 1) -> None:
    # Emit evidence EVD-COSMOS-SERVER-OBS-001
    emit(
        evidence_index={
            "EVD-COSMOS-SERVER-OBS-001": ["evidence/cosmos-server/report.json", "evidence/cosmos-server/metrics.json"],
        },
        report={"status": "metric_recorded", "notes": [f"Metric {name} recorded"]},
        metrics={"counters": {name: value}}
    )

def emit_alert_skeleton(alert_id: str, message: str) -> None:
    # Placeholder for alert rules skeleton
    emit(
        evidence_index={
            "EVD-COSMOS-SERVER-OBS-001": ["evidence/cosmos-server/report.json", "evidence/cosmos-server/metrics.json"],
        },
        report={"status": "alert_triggered", "notes": [f"Alert {alert_id}: {message}"]},
        metrics={"counters": {"alerts_triggered": 1}}
    )
