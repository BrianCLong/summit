"""Masked-action PPO implementation tailored for IG-RL."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import torch
from torch import nn
from torch.distributions import Categorical


@dataclass(slots=True)
class PPOConfig:
    learning_rate: float = 3e-4
    clip_ratio: float = 0.2
    entropy_coef: float = 0.01
    value_coef: float = 0.5
    max_grad_norm: float = 0.5


class ActorCritic(nn.Module):
    def __init__(self, obs_dim: int, act_dim: int) -> None:
        super().__init__()
        self.shared = nn.Sequential(
            nn.Linear(obs_dim, 512),
            nn.ReLU(),
            nn.Linear(512, 256),
            nn.ReLU(),
        )
        self.actor = nn.Linear(256, act_dim)
        self.critic = nn.Linear(256, 1)

    def forward(self, obs: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        latent = self.shared(obs)
        return self.actor(latent), self.critic(latent)


class PPOAgent:
    """Simplified PPO trainer that respects action masks."""

    def __init__(self, obs_dim: int, act_dim: int, config: PPOConfig | None = None) -> None:
        self.config = config or PPOConfig()
        self.policy = ActorCritic(obs_dim, act_dim)
        self.optimizer = torch.optim.Adam(self.policy.parameters(), lr=self.config.learning_rate)

    def policy_distribution(
        self, logits: torch.Tensor, mask: Sequence[bool] | None = None
    ) -> Categorical:
        if mask is not None:
            mask_tensor = torch.tensor(mask, dtype=torch.bool, device=logits.device)
            logits = logits.masked_fill(~mask_tensor, float("-inf"))
        return Categorical(logits=logits)

    def act(
        self, obs: torch.Tensor, mask: Sequence[bool] | None = None
    ) -> tuple[int, torch.Tensor, torch.Tensor]:
        logits, value = self.policy(obs)
        dist = self.policy_distribution(logits.squeeze(0), mask)
        action = dist.sample()
        return int(action.item()), dist.log_prob(action), value.squeeze(-1)

    def update(
        self, batch: dict[str, torch.Tensor], mask: torch.Tensor | None = None
    ) -> dict[str, float]:
        obs = batch["obs"]
        actions = batch["actions"]
        advantages = batch["advantages"]
        returns = batch["returns"]
        old_log_probs = batch["log_probs"]

        logits, values = self.policy(obs)
        dist = self.policy_distribution(logits, mask.tolist() if mask is not None else None)
        log_probs = dist.log_prob(actions)
        entropy = dist.entropy().mean()

        ratio = torch.exp(log_probs - old_log_probs)
        clipped = torch.clamp(ratio, 1.0 - self.config.clip_ratio, 1.0 + self.config.clip_ratio)
        actor_loss = -torch.min(ratio * advantages, clipped * advantages).mean()

        critic_loss = torch.nn.functional.mse_loss(values.squeeze(-1), returns)

        loss = (
            actor_loss + self.config.value_coef * critic_loss - self.config.entropy_coef * entropy
        )

        self.optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self.policy.parameters(), self.config.max_grad_norm)
        self.optimizer.step()

        return {
            "loss": float(loss.item()),
            "actor_loss": float(actor_loss.item()),
            "critic_loss": float(critic_loss.item()),
            "entropy": float(entropy.item()),
        }
