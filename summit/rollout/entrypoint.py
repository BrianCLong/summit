from summit.precision import policy_from_dict


def run_rollout(cfg: dict):
    policy = policy_from_dict(cfg.get("precision_flow", {}))
    cfg["_resolved_precision_flow"] = policy  # TODO: replace with proper context plumbing
    # TODO: apply policy to model forward / sampler
    pass
