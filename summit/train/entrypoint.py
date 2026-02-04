from summit.precision import policy_from_dict


def run_train(cfg: dict):
    policy = policy_from_dict(cfg.get("precision_flow", {}))
    cfg["_resolved_precision_flow"] = policy
    # TODO: apply policy to training forward/backward
    pass
