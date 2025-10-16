"""Training orchestration for IG-RL."""

from __future__ import annotations

import asyncio
from collections.abc import Iterable
from dataclasses import dataclass

import torch

from ..agents.contextual_bandit import LinUCB
from ..agents.ppo_agent import PPOAgent


@dataclass(slots=True)
class TrainingJob:
    job_id: str
    kind: str
    status: str


class TrainingManager:
    """Coordinates offline/online training workloads."""

    def __init__(self) -> None:
        self._jobs: dict[str, TrainingJob] = {}

    def register_job(self, job_id: str, kind: str) -> TrainingJob:
        job = TrainingJob(job_id=job_id, kind=kind, status="pending")
        self._jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> TrainingJob | None:
        return self._jobs.get(job_id)

    async def train_bandit(
        self, job: TrainingJob, learner: LinUCB, feedback_stream: Iterable
    ) -> None:
        job.status = "running"
        async for feedback in feedback_stream:
            learner.update(feedback.context, feedback.action, feedback.reward)
        job.status = "completed"

    async def train_ppo(
        self, job: TrainingJob, agent: PPOAgent, batches: Iterable[dict[str, torch.Tensor]]
    ) -> None:
        job.status = "running"
        for batch in batches:
            agent.update(batch)
            await asyncio.sleep(0)
        job.status = "completed"
