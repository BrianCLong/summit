import os
import json
from summit.influence.llm_monitor import LLMMonitor

def main():
    monitor = LLMMonitor()
    os.makedirs("artifacts", exist_ok=True)
    monitor.save_metrics("artifacts/llm_reference_metrics.json")
    print("LLM reference metrics saved.")

if __name__ == "__main__":
    main()
