"""FastAPI application for the Governance SLO monitor."""

from __future__ import annotations

import json
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from .alerting import BurnRateMonitor
from .config import DEFAULT_BURN_RATE, DEFAULT_THRESHOLDS, BurnRateConfig, SLOThresholds
from .metrics import REDMetricsMiddleware, metrics_response
from .models import (
    AppealEvent,
    BlockEvent,
    BurnRateAlert,
    CanaryEvent,
    DashboardPayload,
    DecisionEvent,
    PolicyCommit,
    SLOSnapshot,
    SyntheticSchedule,
    TimeseriesPoint,
    ViolationEvent,
)
from .service import GovernanceSLOService
from .synthetic import SyntheticTrafficGenerator


def create_app(
    thresholds: SLOThresholds = DEFAULT_THRESHOLDS,
    burn_config: BurnRateConfig = DEFAULT_BURN_RATE,
    synthetic_schedule: SyntheticSchedule = SyntheticSchedule(),
) -> FastAPI:
    """Instantiate the Governance SLO monitoring service application."""

    service = GovernanceSLOService(
        thresholds=thresholds,
        history_retention=burn_config.history_retention,
    )
    burn_monitor = BurnRateMonitor(service, burn_config)
    traffic = SyntheticTrafficGenerator(service, synthetic_schedule)

    app = FastAPI(title="Governance SLO Monitor", version="1.0.0")
    app.add_middleware(REDMetricsMiddleware)

    @app.on_event("startup")
    async def _startup() -> None:
        await burn_monitor.start()
        await traffic.start()

    @app.on_event("shutdown")
    async def _shutdown() -> None:
        await burn_monitor.stop()
        await traffic.stop()

    @app.get("/healthz")
    async def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/metrics")
    def metrics():
        return metrics_response()

    @app.get("/slo", response_model=SLOSnapshot)
    async def get_slo_snapshot() -> SLOSnapshot:
        return await service.snapshot()

    @app.get("/alerts", response_model=List[BurnRateAlert])
    async def get_alerts() -> List[BurnRateAlert]:
        return burn_monitor.get_alerts()

    @app.get("/dashboard.json", response_model=DashboardPayload)
    async def dashboard_json() -> DashboardPayload:
        return await service.get_dashboard_payload(burn_monitor.get_alerts())

    @app.get("/dashboard", response_class=HTMLResponse)
    async def dashboard() -> HTMLResponse:
        payload = await service.get_dashboard_payload(burn_monitor.get_alerts())
        return HTMLResponse(render_dashboard(payload))

    @app.post("/events/violation", status_code=202)
    async def post_violation(event: ViolationEvent) -> dict[str, str]:
        await service.record_violation(event)
        return {"status": "queued"}

    @app.post("/events/block", status_code=202)
    async def post_block(event: BlockEvent) -> dict[str, str]:
        await service.record_block(event)
        return {"status": "processed"}

    @app.post("/events/canary", status_code=202)
    async def post_canary(event: CanaryEvent) -> dict[str, str]:
        await service.seed_canary(event)
        return {"status": "seeded"}

    @app.post("/events/decision", status_code=202)
    async def post_decision(event: DecisionEvent) -> dict[str, str]:
        await service.record_decision(event)
        return {"status": "recorded"}

    @app.post("/events/policy", status_code=202)
    async def post_policy(commit: PolicyCommit) -> dict[str, str]:
        await service.record_policy_commit(commit)
        return {"status": "updated"}

    @app.post("/events/appeal", status_code=202)
    async def post_appeal(event: AppealEvent) -> dict[str, str]:
        await service.file_appeal(event)
        return {"status": "filed"}

    class AppealResolution(BaseModel):
        appeal_id: str
        resolved_at: Optional[datetime] = None

    @app.post("/events/appeal/resolve", status_code=202)
    async def resolve_appeal(event: AppealResolution) -> dict[str, str]:
        await service.resolve_appeal(event.appeal_id, event.resolved_at)
        return {"status": "closed"}

    return app


def render_dashboard(payload: DashboardPayload) -> str:
    """Render a time-series dashboard for the four governance SLOs."""

    def serialize_series(points: List[TimeseriesPoint]) -> list[dict[str, float | str]]:
        return [{"x": point.ts.isoformat(), "y": point.value} for point in points]

    history = {
        name: serialize_series(points)
        for name, points in payload.history.items()
    }
    history_json = json.dumps(history)
    snapshot = payload.snapshot
    alerts = [alert.model_dump() for alert in payload.alerts]
    alerts_json = json.dumps(alerts)

    return f"""
<!DOCTYPE html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\" />
    <title>Governance SLO Monitor</title>
    <script src=\"https://cdn.jsdelivr.net/npm/chart.js\"></script>
    <script src=\"https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/global/luxon.min.js\"></script>
    <script src=\"https://cdn.jsdelivr.net/npm/chartjs-adapter-luxon@1.4.0\"></script>
    <style>
      body {{ font-family: Arial, sans-serif; margin: 2rem; background-color: #f7f7f7; }}
      h1 {{ margin-bottom: 0.5rem; }}
      .slo-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }}
      .card {{ background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }}
      canvas {{ width: 100%; height: 220px; }}
      .alerts {{ margin-top: 2rem; }}
      .alert {{ background: #ffe7e7; border: 1px solid #f5a9a9; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; }}
    </style>
  </head>
  <body>
    <h1>Governance SLO Monitor</h1>
    <p>Snapshot captured at {snapshot.collected_at.isoformat()}.</p>
    <div class=\"slo-grid\">
      <div class=\"card\"><canvas id=\"time_to_block_seconds\"></canvas></div>
      <div class=\"card\"><canvas id=\"false_negative_rate\"></canvas></div>
      <div class=\"card\"><canvas id=\"decision_freshness_seconds\"></canvas></div>
      <div class=\"card\"><canvas id=\"appeal_latency_seconds\"></canvas></div>
    </div>
    <div class=\"alerts\">
      <h2>Active Burn-Rate Alerts</h2>
      <div id=\"alerts-container\"></div>
    </div>
    <script>
      const history = {history_json};
      const alerts = {alerts_json};
      const sloNames = [
        {{ id: 'time_to_block_seconds', label: 'Time to Block (s)' }},
        {{ id: 'false_negative_rate', label: 'False Negative Rate' }},
        {{ id: 'decision_freshness_seconds', label: 'Decision Freshness (s)' }},
        {{ id: 'appeal_latency_seconds', label: 'Appeal Latency (s)' }}
      ];
      sloNames.forEach((cfg) => {{
        const ctx = document.getElementById(cfg.id);
        new Chart(ctx, {{
          type: 'line',
          data: {{
            datasets: [{{
              label: cfg.label,
              data: history[cfg.id] || [],
              fill: false,
              borderColor: '#2563eb',
              tension: 0.3,
            }}],
          }},
          options: {{
            parsing: false,
            scales: {{ x: {{ type: 'time', time: {{ parser: true, tooltipFormat: 'MMM d HH:mm:ss' }} }} }},
            plugins: {{
              legend: {{ display: true }},
            }},
          }},
        }});
      }});
      const alertsContainer = document.getElementById('alerts-container');
      if (alerts.length === 0) {{
        alertsContainer.innerHTML = '<p>No active burn-rate alerts.</p>';
      }} else {{
        alerts.forEach((alert) => {{
          const div = document.createElement('div');
          div.className = 'alert';
          div.innerHTML = '<strong>' + alert.slo_name + '</strong> burn rate <strong>' +
            alert.burn_rate.toFixed(2) + '</strong> since ' + alert.triggered_at;
          alertsContainer.appendChild(div);
        }});
      }}
    </script>
  </body>
</html>
"""
