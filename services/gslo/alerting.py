"""Burn-rate monitoring utilities for governance SLOs."""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Dict, List, Optional

from .config import BurnRateConfig
from .metrics import SLO_GAUGES, get_burn_rate_gauge
from .models import BurnRateAlert, SLOSnapshot
from .service import GovernanceSLOService


class BurnRateMonitor:
    """Periodically evaluates SLO performance and raises burn-rate alerts."""

    def __init__(
        self,
        service: GovernanceSLOService,
        config: BurnRateConfig,
    ) -> None:
        self._service = service
        self._config = config
        self._alerts: Dict[str, BurnRateAlert] = {}
        self._breach_started: Dict[str, datetime] = {}
        self._task: Optional[asyncio.Task] = None
        self._stopped = asyncio.Event()

    async def start(self) -> None:
        if self._task is not None:
            return
        self._stopped.clear()
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        if self._task is None:
            return
        self._stopped.set()
        await self._task
        self._task = None

    async def _run_loop(self) -> None:
        interval = self._config.evaluation_interval.total_seconds()
        while not self._stopped.is_set():
            snapshot = await self._service.snapshot()
            self._evaluate_snapshot(snapshot)
            try:
                await asyncio.wait_for(self._stopped.wait(), timeout=interval)
            except asyncio.TimeoutError:
                continue

    def _evaluate_snapshot(self, snapshot: SLOSnapshot) -> None:
        thresholds = self._service.thresholds
        metrics = {
            "time_to_block_seconds": (snapshot.time_to_block_seconds, thresholds.time_to_block_seconds),
            "false_negative_rate": (snapshot.false_negative_rate, thresholds.false_negative_rate),
            "decision_freshness_seconds": (
                snapshot.decision_freshness_seconds,
                thresholds.decision_freshness_seconds,
            ),
            "appeal_latency_seconds": (snapshot.appeal_latency_seconds, thresholds.appeal_latency_seconds),
        }

        now = snapshot.collected_at
        for slo_name, (value, target) in metrics.items():
            if slo_name in SLO_GAUGES:
                SLO_GAUGES[slo_name].set(value)
            if target <= 0:
                continue
            burn_rate = value / target if target else 0.0
            get_burn_rate_gauge(slo_name).set(burn_rate)
            if burn_rate > 1:
                start = self._breach_started.setdefault(slo_name, now)
                if now - start >= self._config.alert_window:
                    self._alerts[slo_name] = BurnRateAlert(
                        slo_name=slo_name,
                        burn_rate=burn_rate,
                        triggered_at=start,
                        details={
                            "observed": f"{value:.2f}",
                            "target": f"{target:.2f}",
                        },
                    )
            else:
                self._breach_started.pop(slo_name, None)
                self._alerts.pop(slo_name, None)

    def get_alerts(self) -> List[BurnRateAlert]:
        return sorted(self._alerts.values(), key=lambda alert: alert.triggered_at)

