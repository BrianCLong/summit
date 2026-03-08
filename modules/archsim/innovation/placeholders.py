import os


def incremental_diff(old_spec, new_spec):
    if os.getenv("ARCHSIM_INCREMENTAL", "0") != "1":
        return "Incremental diffing is disabled (ARCHSIM_INCREMENTAL=0)"
    # Placeholder for incremental logic
    return "No changes detected (placeholder)"

def export_to_iac(spec, provider="terraform"):
    if os.getenv("ARCHSIM_IAC_ADAPTERS", "0") != "1":
        return "IaC adapters are disabled (ARCHSIM_IAC_ADAPTERS=0)"
    # Placeholder for IaC logic
    return f"Exporting to {provider} (placeholder)"
