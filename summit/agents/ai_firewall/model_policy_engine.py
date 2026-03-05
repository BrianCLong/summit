def enforce_model_policy(model_name, model_risk):
    if model_risk == "high":
        return False, "require extra validation"
    return True, "approved"
