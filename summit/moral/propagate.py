from typing import Any, Dict, List

from .foundations import MFT5, UNKNOWN_KEY, normalize


def propagate_priors(
    graph: Any,
    priors: dict[str, dict[str, float]],
    alpha: float = 0.5
) -> dict[str, dict[str, float]]:
    """
    Propagate moral priors across the influence graph.
    Formula: Node posterior = normalize( α * node_prior + (1-α) * Σ_w neighbor_vector )

    Args:
        graph: Expected to be a dict of dicts {node: {neighbor: weight}}
        priors: Dict mapping node_id to normalized moral vector
        alpha: Weight for the prior (vs neighbors). 0..1

    Returns:
        Dict mapping node_id to posterior moral vector
    """
    # Defensive check: if graph is not a dict, we can't process it with this simple logic
    if not isinstance(graph, dict):
        return {}

    posteriors = {}
    nodes = list(graph.keys())

    # Ensure keys includes UNKNOWN_KEY
    all_keys = list(MFT5) + [UNKNOWN_KEY]

    for node in nodes:
        # Get prior vector, default to unknown
        # If node has no prior, we treat it as unknown (all mass on unknown) or zero?
        # If we use normalize({}), we get unknown=1.0
        prior_raw = priors.get(node, {})
        prior_vec = normalize(prior_raw)

        # Calculate neighbor contribution
        neighbors = graph.get(node, {})
        neighbor_sum = {k: 0.0 for k in all_keys}
        total_weight = 0.0

        for nbr, weight in neighbors.items():
            # For this single-step propagation, we look at neighbors' priors.
            # If a neighbor has no prior, do they contribute?
            # If they have no prior, their vector is "unknown".
            if nbr in priors:
                nbr_vec = normalize(priors[nbr])
            else:
                # If neighbor has no prior, treat as unknown
                nbr_vec = normalize({})

            for k in all_keys:
                neighbor_sum[k] += nbr_vec.get(k, 0.0) * float(weight)
            total_weight += float(weight)

        # Normalize neighbor sum (weighted average)
        if total_weight > 0:
            for k in all_keys:
                neighbor_sum[k] /= total_weight
        else:
            # If no neighbors, neighbor component is neutral/unknown
            neighbor_sum = normalize({})

        # Combine
        combined = {}
        for k in all_keys:
            p_val = prior_vec.get(k, 0.0)
            n_val = neighbor_sum.get(k, 0.0)
            combined[k] = alpha * p_val + (1.0 - alpha) * n_val

        posteriors[node] = normalize(combined)

    return posteriors
