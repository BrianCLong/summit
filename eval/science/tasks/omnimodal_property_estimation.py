def run_omnimodal(config):
    modality = config.get("modality", "")
    allowed = ["imaging", "spectra", "scalar"]
    if modality not in allowed:
         raise ValueError(f"Modality {modality} not supported. Must be one of {allowed}")
    # Dummy implementation
    return {"status": "success", "metric": 0.05}
