import sys
import json
from summit.cbm.ai_exposure import map_ai_exposure, write_exposure_artifacts
from summit.cbm.pipeline import CBMConfig

def main():
    cfg = CBMConfig(enabled=True, llm_probe_enabled=True)
    if not cfg.llm_probe_enabled:
        print("LLM probe disabled.")
        sys.exit(0)

    prompts = [{"text": "Probe query"}]
    exposure = map_ai_exposure(prompts)
    write_exposure_artifacts(exposure, "artifacts/cbm/ai_exposure.json")

if __name__ == "__main__":
    main()
