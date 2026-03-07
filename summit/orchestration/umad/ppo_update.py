import torch
import torch.nn as nn
import torch.nn.functional as F

class UMADPPOAgent(nn.Module):
    """
    A minimal pseudocode sketch for the UMAD PPO Agent (Phase 2).
    Includes Aleatoric-modulated advantage and Epistemic intrinsic rewards.
    """
    def __init__(self, state_dim, action_dim):
        super().__init__()
        # Actor network
        self.actor = nn.Sequential(
            nn.Linear(state_dim, 128),
            nn.ReLU(),
            nn.Linear(128, action_dim),
            nn.Softmax(dim=-1)
        )
        # Critic network (shared value function)
        self.critic = nn.Sequential(
            nn.Linear(state_dim, 128),
            nn.ReLU(),
            nn.Linear(128, 1)
        )

    def forward(self, state):
        action_probs = self.actor(state)
        state_value = self.critic(state)
        return action_probs, state_value

def umad_ppo_update_step(
    agent: UMADPPOAgent,
    optimizer: torch.optim.Optimizer,
    states: torch.Tensor,
    actions: torch.Tensor,
    old_log_probs: torch.Tensor,
    returns: torch.Tensor,
    standard_advantages: torch.Tensor,
    sys_au_scores: torch.Tensor,
    clip_ratio: float = 0.2,
    vf_coef: float = 0.5,
    ent_coef: float = 0.01,
    au_threshold: float = 0.8
):
    """
    Perform a single PPO update step with UMAD signals.

    Args:
        agent: The PPO agent model.
        optimizer: The PyTorch optimizer.
        states: Tensor of states.
        actions: Tensor of actions taken.
        old_log_probs: Tensor of log probabilities of actions under the old policy.
        returns: Tensor of discounted returns (including r_acc, r_au, r_eu).
        standard_advantages: Tensor of standard generalized advantage estimates.
        sys_au_scores: Tensor of Aleatoric Uncertainty scores per state/action.
        clip_ratio: PPO clipping parameter.
        vf_coef: Value function loss coefficient.
        ent_coef: Entropy loss coefficient.
        au_threshold: Threshold for downweighting based on AU.
    """

    # Calculate uncertainty weights: W(U_i) = exp(-max(0, AU - threshold))
    # Downweight standard advantages for noisy trajectories.
    au_penalty = F.relu(sys_au_scores - au_threshold)
    uncertainty_weights = torch.exp(-au_penalty)

    # Aleatoric-modulated advantage: A^au = W(U_i) * A_standard
    modulated_advantages = uncertainty_weights * standard_advantages

    # Normalize advantages (optional but recommended)
    modulated_advantages = (modulated_advantages - modulated_advantages.mean()) / (modulated_advantages.std() + 1e-8)

    # Forward pass
    action_probs, state_values = agent(states)

    # Get current log probs
    dist = torch.distributions.Categorical(action_probs)
    new_log_probs = dist.log_prob(actions)
    entropy = dist.entropy().mean()

    # Policy loss (clipped surrogate objective)
    ratios = torch.exp(new_log_probs - old_log_probs)
    surr1 = ratios * modulated_advantages
    surr2 = torch.clamp(ratios, 1.0 - clip_ratio, 1.0 + clip_ratio) * modulated_advantages
    actor_loss = -torch.min(surr1, surr2).mean()

    # Value loss
    critic_loss = F.mse_loss(state_values.squeeze(-1), returns)

    # Total loss
    loss = actor_loss + vf_coef * critic_loss - ent_coef * entropy

    # Backprop
    optimizer.zero_grad()
    loss.backward()
    # Gradient clipping could be applied here
    optimizer.step()

    return loss.item(), actor_loss.item(), critic_loss.item(), entropy.item()
