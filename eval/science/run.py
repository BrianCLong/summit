import json, sys
import os

# Ensure we can import from the repo root
sys.path.append(os.getcwd())

from eval.science.tasks.continuum_forecast import run_continuum_forecast
from eval.science.tasks.omnimodal_property_estimation import run_omnimodal

def main():
    if len(sys.argv) < 2:
        print("Usage: python -m eval.science.run <config_file>")
        sys.exit(1)

    cfg_path = sys.argv[1]
    if not os.path.exists(cfg_path):
        print(f"Config file not found: {cfg_path}")
        sys.exit(1)

    with open(cfg_path) as f:
        cfg = json.load(f)

    out = {"tasks": []}
    if cfg.get("continuum_forecast", {}).get("enabled", False):
        out["tasks"].append(run_continuum_forecast(cfg["continuum_forecast"]))
    if cfg.get("omnimodal", {}).get("enabled", False):
        out["tasks"].append(run_omnimodal(cfg["omnimodal"]))
    print(json.dumps(out, indent=2, sort_keys=True))

if __name__ == "__main__":
    main()
