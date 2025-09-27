"""Synthetic traffic generator for the governance SLO monitor."""

from __future__ import annotations

import asyncio
import random
from collections import deque
from datetime import datetime, timedelta
from typing import Deque, List
from uuid import uuid4

from .models import (
    AppealEvent,
    BlockEvent,
    CanaryEvent,
    DecisionEvent,
    PolicyCommit,
    SyntheticSchedule,
    ViolationEvent,
)
from .service import GovernanceSLOService


class SyntheticTrafficGenerator:
    """Injects synthetic violations, canaries, and appeals on a schedule."""

    def __init__(
        self,
        service: GovernanceSLOService,
        schedule: SyntheticSchedule,
    ) -> None:
        self._service = service
        self._schedule = schedule
        self._rng = random.Random()
        self._stop = asyncio.Event()
        self._tasks: List[asyncio.Task[None]] = []
        self._decisions: Deque[str] = deque(maxlen=512)
        self._current_commit = PolicyCommit(commit_sha=self._new_commit_sha())
        self._policy_lock = asyncio.Lock()

    async def start(self) -> None:
        if self._tasks:
            return
        await self._service.record_policy_commit(self._current_commit)
        self._stop.clear()
        self._tasks = [
            asyncio.create_task(self._run_violation_stream()),
            asyncio.create_task(self._run_canary_stream()),
            asyncio.create_task(self._run_appeal_stream()),
            asyncio.create_task(self._run_policy_refresher()),
        ]

    async def stop(self) -> None:
        if not self._tasks:
            return
        self._stop.set()
        await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks.clear()

    async def _run_violation_stream(self) -> None:
        interval = self._schedule.violation_interval_seconds
        while not self._stop.is_set():
            violation_id = str(uuid4())
            detected_at = datetime.utcnow()
            await self._service.record_violation(
                ViolationEvent(
                    violation_id=violation_id,
                    detected_at=detected_at,
                    control=self._rng.choice(["geo", "content", "compliance"]),
                )
            )
            block_delay = self._rng.uniform(10, 240)
            asyncio.create_task(self._complete_block(violation_id, detected_at, block_delay))
            await self._record_decision(detected_at + timedelta(seconds=block_delay))
            await self._sleep(interval)

    async def _complete_block(self, violation_id: str, detected_at: datetime, delay: float) -> None:
        try:
            await asyncio.wait_for(self._stop.wait(), timeout=delay)
            return
        except asyncio.TimeoutError:
            pass
        await self._service.record_block(
            BlockEvent(
                violation_id=violation_id,
                blocked_at=detected_at + timedelta(seconds=delay),
                control="auto-blocker",
            )
        )

    async def _record_decision(self, decided_at: datetime) -> None:
        async with self._policy_lock:
            commit_sha = self._current_commit.commit_sha
        decision_id = str(uuid4())
        await self._service.record_decision(
            DecisionEvent(
                decision_id=decision_id,
                policy_sha=commit_sha,
                decided_at=decided_at,
            )
        )
        self._decisions.append(decision_id)

    async def _run_canary_stream(self) -> None:
        interval = self._schedule.canary_interval_seconds
        while not self._stop.is_set():
            violation_id = f"canary-{uuid4()}"
            canary = CanaryEvent(canary_id=str(uuid4()), violation_id=violation_id)
            await self._service.seed_canary(canary)
            # 20% chance to simulate a false negative (no block)
            if self._rng.random() < 0.8:
                delay = self._rng.uniform(15, 90)
                asyncio.create_task(self._complete_block(violation_id, canary.injected_at, delay))
            await self._sleep(interval)

    async def _run_appeal_stream(self) -> None:
        interval = self._schedule.appeal_interval_seconds
        while not self._stop.is_set():
            if not self._decisions:
                await self._sleep(interval)
                continue
            decision_id = self._rng.choice(list(self._decisions))
            appeal_id = str(uuid4())
            filed_at = datetime.utcnow()
            await self._service.file_appeal(
                AppealEvent(
                    appeal_id=appeal_id,
                    decision_id=decision_id,
                    filed_at=filed_at,
                )
            )
            resolve_delay = self._rng.uniform(120, 3600)
            asyncio.create_task(self._resolve_appeal(appeal_id, filed_at, resolve_delay))
            await self._sleep(interval)

    async def _run_policy_refresher(self) -> None:
        interval = self._schedule.policy_refresh_interval_seconds
        while not self._stop.is_set():
            await self._sleep(interval)
            async with self._policy_lock:
                self._current_commit = PolicyCommit(
                    commit_sha=self._new_commit_sha(),
                    published_at=datetime.utcnow(),
                )
                await self._service.record_policy_commit(self._current_commit)

    async def _resolve_appeal(self, appeal_id: str, filed_at: datetime, delay: float) -> None:
        try:
            await asyncio.wait_for(self._stop.wait(), timeout=delay)
            return
        except asyncio.TimeoutError:
            pass
        await self._service.resolve_appeal(
            appeal_id,
            resolved_at=filed_at + timedelta(seconds=delay),
        )

    async def _sleep(self, seconds: float) -> None:
        try:
            await asyncio.wait_for(self._stop.wait(), timeout=seconds)
        except asyncio.TimeoutError:
            return

    def _new_commit_sha(self) -> str:
        return uuid4().hex[:12]
