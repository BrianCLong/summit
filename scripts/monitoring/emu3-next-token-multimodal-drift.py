#!/usr/bin/env python3
import hashlib
import json
import os
import sys

# Define expected configuration state
EXPECTED_STATE = {
    "model_id": "baaivision/Emu3-Chat",
    "tokenizer_id": "baaivision/Emu3-VisionTokenizer",
}

ARTIFACTS_DIR = "artifacts/emu3"

def main():
    print("Checking Emu3 configuration drift...")

    # In a real scenario, this might import the actual class to get defaults,
    # or read a config file. Here we simulate reading the env/defaults.

    current_model = os.getenv("SUMMIT_EMU3_MODEL_ID", "baaivision/Emu3-Chat")
    current_tokenizer = os.getenv("SUMMIT_EMU3_TOKENIZER_ID", "baaivision/Emu3-VisionTokenizer")

    current_state = {
        "model_id": current_model,
        "tokenizer_id": current_tokenizer,
    }

    drift_detected = False
    if current_state != EXPECTED_STATE:
        print("DRIFT DETECTED!")
        print(f"Expected: {EXPECTED_STATE}")
        print(f"Current:  {current_state}")
        drift_detected = True
    else:
        print("Configuration matches expected state.")

    # Emit drift artifact
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    with open(f"{ARTIFACTS_DIR}/drift.json", "w") as f:
        json.dump({
            "drift_detected": drift_detected,
            "expected": EXPECTED_STATE,
            "current": current_state
        }, f, indent=2)

    if drift_detected:
        sys.exit(1)

if __name__ == "__main__":
    main()
