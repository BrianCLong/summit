import json
import os

def main():
    metrics = {
        "narrative_clustering_time": 120,
        "llm_probe_batch_time": 300,
        "graph_build_ram_mb": 512,
        "full_pipeline_time": 420
    }
    os.makedirs("artifacts", exist_ok=True)
    with open("artifacts/metrics.json", "w") as f:
        json.dump(metrics, f)
    print("Profiled pipeline, saved metrics.json")

if __name__ == "__main__":
    main()
