"""FastAPI application exposing IG-RL service endpoints."""

from __future__ import annotations

import uuid

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from ..agents.contextual_bandit import LinUCB
from ..agents.ppo_agent import PPOAgent
from ..clients.policy import PolicyClient
from ..config import ServiceConfig
from ..provenance.logger import ProvenanceLogger, ProvenanceRecord
from ..reward.hub import RewardHub
from ..training.trainer import TrainingManager
from ..xai.explainer import Explainer


class AdviceRequest(BaseModel):
    env: str = Field(..., description="Environment identifier")
    state: list[float] = Field(..., description="Flattened observation vector")
    candidate_actions: list[str] | None = Field(None, description="Policy-filtered actions")
    case_id: str | None = Field(None, description="Case identifier for provenance")


class AdviceResponse(BaseModel):
    action: str
    score: float
    constraints: list[str]
    explanation_ref: str


class RegisterRewardRequest(BaseModel):
    env: str
    name: str
    kpi_weights: dict[str, float]


class TrainRequest(BaseModel):
    env: str
    job_id: str | None = None


class TrainResponse(BaseModel):
    job_id: str
    status: str


class ExplainResponse(BaseModel):
    decision_id: str
    rationale: str
    counterfactual: str
    features: dict[str, float]


DEFAULT_ACTIONS = [
    "next_best_action",
    "request_more_context",
    "defer_to_operator",
    "branch_alternate",
]


def create_app(
    config: ServiceConfig,
    *,
    policy_client: PolicyClient,
    provenance_logger: ProvenanceLogger,
    explainer: Explainer | None = None,
) -> FastAPI:
    app = FastAPI(title="IG-RL Service", version="0.1.0")
    reward_hub = RewardHub(config.reward.kpi_weights)
    training_manager = TrainingManager()
    explainer = explainer or Explainer(["risk", "cost", "ttfi"])

    # Simple learners kept in memory for prototype usage.
    bandit = LinUCB(DEFAULT_ACTIONS, context_dim=64)
    ppo_agent = PPOAgent(obs_dim=256, act_dim=32)

    app.state.reward_hub = reward_hub
    app.state.training_manager = training_manager
    app.state.bandit = bandit
    app.state.ppo_agent = ppo_agent
    app.state.policy_client = policy_client
    app.state.provenance = provenance_logger
    app.state.explainer = explainer
    app.state.explanations: dict[str, ExplainResponse] = {}

    @app.post("/register_reward")
    async def register_reward(request: RegisterRewardRequest) -> dict[str, str]:
        reward_hub.register(request.name, request.kpi_weights)
        return {"status": "ok"}

    @app.post("/advice", response_model=AdviceResponse)
    async def advice(request: AdviceRequest) -> AdviceResponse:
        if not request.candidate_actions:
            candidate_actions = DEFAULT_ACTIONS
        else:
            candidate_actions = request.candidate_actions

        mask = PolicyClient.mask_actions(candidate_actions, candidate_actions)
        observation = torch.tensor(
            request.state + [0.0] * max(0, 256 - len(request.state)), dtype=torch.float32
        )
        observation = observation[:256].unsqueeze(0)
        bool_mask = mask + [False] * (ppo_agent.policy.actor.out_features - len(mask))

        action_idx, _, value = ppo_agent.act(observation, mask=bool_mask)
        if action_idx >= len(candidate_actions):
            action_idx = 0
        action = candidate_actions[action_idx]

        reward_obs = reward_hub.evaluate(
            config.reward.default_reward_name,
            {"time_to_insight": 1.0, "accuracy": 0.5, "cost": 0.2},
        )
        decision_id = str(uuid.uuid4())
        state_hash = policy_client.state_fingerprint(request.state)
        explanation = app.state.explainer.explain(
            np.array(request.state, dtype=float), action, reward_obs.components
        )
        explanation.decision_id = decision_id
        explain_payload = ExplainResponse(
            decision_id=decision_id,
            rationale=explanation.rationale,
            counterfactual=explanation.counterfactual,
            features=explanation.features,
        )
        app.state.explanations[decision_id] = explain_payload

        await provenance_logger.record(
            ProvenanceRecord(
                decision_id=decision_id,
                case_id=request.case_id or "unknown",
                action=action,
                reward=reward_obs.reward,
                reward_components=reward_obs.components,
                model_hash="ppo-agent-0.1.0",
                state_hash=state_hash,
            ),
        )

        constraints = [
            name for name, allowed in zip(candidate_actions, mask, strict=False) if not allowed
        ]

        return AdviceResponse(
            action=action,
            score=float(value.item()),
            constraints=constraints,
            explanation_ref=decision_id,
        )

    @app.post("/train", response_model=TrainResponse)
    async def train(request: TrainRequest) -> TrainResponse:
        job_id = request.job_id or str(uuid.uuid4())
        job = training_manager.register_job(job_id, request.env)
        job.status = "completed"
        return TrainResponse(job_id=job.job_id, status=job.status)

    @app.get("/explain/{decision_id}", response_model=ExplainResponse)
    async def explain(decision_id: str) -> ExplainResponse:
        payload = app.state.explanations.get(decision_id)
        if payload is None:
            raise HTTPException(status_code=404, detail="Decision not found")
        return payload

    return app
