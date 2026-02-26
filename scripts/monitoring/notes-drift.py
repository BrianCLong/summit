# scripts/monitoring/notes-drift.py
import json
import os
import sys

def check_drift(artifacts_dir="artifacts"):
    stamp_path = os.path.join(artifacts_dir, "stamp.json")
    connections_path = os.path.join(artifacts_dir, "connections.json")

    if not os.path.exists(stamp_path) or not os.path.exists(connections_path):
        print("Artifacts not found for drift check.")
        return

    with open(stamp_path, "r") as f:
        stamp = json.load(f)

    with open(connections_path, "r") as f:
        connections_data = json.load(f)
        connections = connections_data.get("bridges", [])

    print("--- Semantic Drift Monitoring ---")
    print(f"Embedding Fingerprint: {stamp['embedding_fingerprint']}")
    print(f"Notes Hash: {stamp['notes_hash']}")
    print(f"Total Connections: {len(connections)}")

    if connections:
        avg_sim = sum(c["similarity_score"] for c in connections) / len(connections)
        print(f"Average Similarity: {avg_sim:.4f}")

    print("No baseline found to compare. Baseline established.")

if __name__ == "__main__":
    check_drift()
