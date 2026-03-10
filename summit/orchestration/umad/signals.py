import math

from typing import List, Dict, Any, Union

def calculate_sys_au(probabilities: List[float]) -> float:
    """
    Calculate Aleatoric Uncertainty (Sys-AU) as Shannon Entropy.

    Args:
        probabilities (List[float]): A list of probabilities representing
                                      the distribution over possible outcomes/reasoning paths.

    Returns:
        float: The Aleatoric Uncertainty (entropy) of the distribution.
    """
    if not probabilities:
        return 0.0

    # Normalize probabilities if they don't sum to 1
    total_prob = sum(probabilities)
    if total_prob == 0:
        return 0.0

    norm_probs = [p / total_prob for p in probabilities if p > 0]

    # Calculate Shannon Entropy: H(X) = -sum(p_i * log2(p_i))
    entropy = -sum(p * math.log2(p) for p in norm_probs)
    return entropy


def _kl_divergence(p: List[float], q: List[float]) -> float:
    """Calculate KL Divergence D_KL(P || Q)"""
    return sum(p_i * math.log2(p_i / q_i) for p_i, q_i in zip(p, q) if p_i > 0 and q_i > 0)


def calculate_sys_eu(belief_dists: List[List[float]]) -> float:
    """
    Calculate Epistemic Uncertainty (Sys-EU) using Jensen-Shannon Divergence (JSD).

    Args:
        belief_dists (List[List[float]]): A list of probability distributions,
                                          where each distribution represents an agent's belief.
                                          Assume all distributions have the same length.

    Returns:
        float: The Epistemic Uncertainty (JSD) representing divergence between agent beliefs.
    """
    if not belief_dists or len(belief_dists) < 2:
        return 0.0

    # Ensure all distributions have the same length
    num_outcomes = len(belief_dists[0])
    for dist in belief_dists:
        if len(dist) != num_outcomes:
            raise ValueError("All belief distributions must have the same length.")

    num_agents = len(belief_dists)

    # Calculate the average distribution M = (sum(P_i)) / N
    m_dist = [0.0] * num_outcomes
    for i in range(num_outcomes):
        m_dist[i] = sum(dist[i] for dist in belief_dists) / num_agents

    # Calculate JSD: JSD(P_1, ..., P_N) = (1/N) * sum(D_KL(P_i || M))
    jsd = sum(_kl_divergence(dist, m_dist) for dist in belief_dists) / num_agents

    return jsd


def calculate_umad_rewards(
    agent_accuracy: float,
    sys_au: float,
    peer_accuracy_gain: float,
    config: Dict[str, Any]
) -> Dict[str, float]:
    """
    Calculate UMAD rewards (accuracy, aleatoric uncertainty, epistemic influence).

    Args:
        agent_accuracy (float): Verifiable correctness (1.0 for correct, 0.0 for incorrect).
        sys_au (float): The calculated Aleatoric Uncertainty (entropy) of the agent's reasoning.
        peer_accuracy_gain (float): Delta accuracy in peer agents induced by this agent's response.
        config (Dict[str, Any]): UMAD configuration dict.

    Returns:
        Dict[str, float]: A dictionary containing the individual rewards and the total reward.
    """
    train_config = config.get("training", {})
    w_acc = train_config.get("accuracy_reward_weight", 1.0)
    w_au = train_config.get("au_reward_weight", 0.5)
    w_eu = train_config.get("eu_influence_reward_weight", 0.8)

    # Accuracy reward: verifiable correctness
    r_acc = agent_accuracy * w_acc

    # Aleatoric Uncertainty reward: penalize high entropy
    r_au = -sys_au * w_au

    # Epistemic Influence reward: peer accuracy gain modulated by correctness
    r_eu = peer_accuracy_gain * agent_accuracy * w_eu

    total_reward = r_acc + r_au + r_eu

    return {
        "r_acc": r_acc,
        "r_au": r_au,
        "r_eu": r_eu,
        "total_reward": total_reward
    }

def estimate_uncertainty_weight(sys_au: float, threshold: float = 0.8) -> float:
    """
    Calculate the uncertainty weight W(U_i) for the Aleatoric-modulated advantage.
    Downweights noisy trajectories.
    """
    # Simple exponential decay based on AU relative to threshold
    # If AU is low, weight is near 1. If AU is high, weight decays.
    return math.exp(-max(0, sys_au - threshold))
