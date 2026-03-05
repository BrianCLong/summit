def verify_dependency(package_name, risk_score):
    if risk_score > 50:
        return False, "deny_if_package_risk_score > threshold"
    return True, "approved"
