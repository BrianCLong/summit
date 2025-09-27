"""Core governance SLO aggregation logic."""

from __future__ import annotations

import asyncio
from collections import deque
from datetime import datetime, timedelta
from statistics import fmean
from typing import Deque, Dict, Iterable, List, Optional

from .config import SLOThresholds
from .models import (
    AppealEvent,
    BlockEvent,
    CanaryEvent,
    DecisionEvent,
    DashboardPayload,
    BurnRateAlert,
    PolicyCommit,
    SLOSnapshot,
    TimeseriesPoint,
    ViolationEvent,
)


def _mean(values: Iterable[float]) -> float:
    """Return the mean of the values or 0 when empty."""

    vals = list(values)
    return fmean(vals) if vals else 0.0


class GovernanceSLOService:
    """In-memory governance SLO aggregation service."""

    def __init__(
        self,
        thresholds: SLOThresholds,
        history_retention: timedelta,
    ) -> None:
        self._thresholds = thresholds
        self._history_retention = history_retention
        self._lock = asyncio.Lock()

        self._violations: Dict[str, ViolationEvent] = {}
        self._canaries: Dict[str, CanaryEvent] = {}
        self._policy_commits: Dict[str, PolicyCommit] = {}
        self._appeals_open: Dict[str, AppealEvent] = {}

        self._block_durations: Deque[float] = deque(maxlen=5000)
        self._decision_freshness: Deque[float] = deque(maxlen=5000)
        self._appeal_latencies: Deque[float] = deque(maxlen=5000)

        self._canary_total = 0
        self._canary_blocked = 0

        self._history: Dict[str, Deque[TimeseriesPoint]] = {
            "time_to_block_seconds": deque(),
            "false_negative_rate": deque(),
            "decision_freshness_seconds": deque(),
            "appeal_latency_seconds": deque(),
        }

    async def record_violation(self, event: ViolationEvent) -> None:
        async with self._lock:
            self._violations[event.violation_id] = event

    async def record_block(self, event: BlockEvent) -> None:
        async with self._lock:
            violation = self._violations.pop(event.violation_id, None)
            if violation is None:
                return
            duration = (event.blocked_at - violation.detected_at).total_seconds()
            if duration >= 0:
                self._block_durations.append(duration)

            # Mark any associated canary as blocked
            for canary in self._canaries.values():
                if canary.violation_id == event.violation_id and not canary.blocked:
                    canary.blocked = True
                    canary.blocked_at = event.blocked_at
                    self._canary_blocked += 1

    async def seed_canary(self, event: CanaryEvent) -> None:
        async with self._lock:
            self._canaries[event.canary_id] = event
            self._canary_total += 1
            self._violations[event.violation_id] = ViolationEvent(
                violation_id=event.violation_id,
                detected_at=event.injected_at,
                control="seeded-canary",
            )

    async def record_policy_commit(self, commit: PolicyCommit) -> None:
        async with self._lock:
            self._policy_commits[commit.commit_sha] = commit

    async def record_decision(self, decision: DecisionEvent) -> None:
        async with self._lock:
            commit = self._policy_commits.get(decision.policy_sha)
            if commit is None:
                return
            freshness = (decision.decided_at - commit.published_at).total_seconds()
            if freshness >= 0:
                self._decision_freshness.append(freshness)

    async def file_appeal(self, appeal: AppealEvent) -> None:
        async with self._lock:
            self._appeals_open[appeal.appeal_id] = appeal

    async def resolve_appeal(self, appeal_id: str, resolved_at: Optional[datetime] = None) -> None:
        async with self._lock:
            appeal = self._appeals_open.pop(appeal_id, None)
            if appeal is None:
                return
            resolved_time = resolved_at or datetime.utcnow()
            latency = (resolved_time - appeal.filed_at).total_seconds()
            if latency >= 0:
                self._appeal_latencies.append(latency)

    async def snapshot(self) -> SLOSnapshot:
        async with self._lock:
            snapshot = SLOSnapshot(
                time_to_block_seconds=_mean(self._block_durations),
                false_negative_rate=self._compute_false_negative_rate(),
                decision_freshness_seconds=_mean(self._decision_freshness),
                appeal_latency_seconds=_mean(self._appeal_latencies),
            )
            self._append_history(snapshot)
            return snapshot

    def _compute_false_negative_rate(self) -> float:
        if self._canary_total == 0:
            return 0.0
        missed = self._canary_total - self._canary_blocked
        return missed / float(self._canary_total)

    def _append_history(self, snapshot: SLOSnapshot) -> None:
        for key in self._history:
            value = getattr(snapshot, key)
            series = self._history[key]
            series.append(TimeseriesPoint(ts=snapshot.collected_at, value=value))
            self._prune_history(series, snapshot.collected_at)

    def _prune_history(self, series: Deque[TimeseriesPoint], now: datetime) -> None:
        while series and now - series[0].ts > self._history_retention:
            series.popleft()

    async def get_history(self) -> Dict[str, List[TimeseriesPoint]]:
        async with self._lock:
            return {key: list(points) for key, points in self._history.items()}

    async def get_dashboard_payload(
        self, alerts: Optional[List[BurnRateAlert]] = None
    ) -> DashboardPayload:
        snapshot = await self.snapshot()
        history = await self.get_history()
        return DashboardPayload(snapshot=snapshot, history=history, alerts=alerts or [])

    @property
    def thresholds(self) -> SLOThresholds:
        return self._thresholds
