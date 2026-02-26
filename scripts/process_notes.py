# scripts/process_notes.py
import os
import json
import argparse
import hashlib
from summit.ingestion.notes_loader import NotesLoader
from summit.embeddings.local_provider import LocalEmbeddingProvider
from summit.graph.semantic_bridges import SemanticBridgeEngine
from summit.report.generator import ReportGenerator

def main():
    parser = argparse.ArgumentParser(description="Summit Notes Processing Pipeline")
    parser.add_argument("--notes-dir", default="samples/notes", help="Directory containing notes")
    parser.add_argument("--out-dir", default="artifacts", help="Output directory")
    args = parser.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)

    # 1. Ingestion
    loader = NotesLoader(args.notes_dir)
    notes = loader.load_notes()
    print(f"Loaded {len(notes)} note chunks.")

    # 2. Embeddings & Similarity
    provider = LocalEmbeddingProvider()
    engine = SemanticBridgeEngine(provider)
    bridges = engine.find_bridges(notes, top_k=10)
    print(f"Found {len(bridges)} semantic bridges.")

    # 3. Artifact Generation
    connections_path = os.path.join(args.out_dir, "connections.json")
    with open(connections_path, "w") as f:
        # Wrap in report format for verify_evidence.py
        report_data = {
            "evidence_id": "EVD-NOTES-BRIDGE-001",
            "item_slug": "local-notes-semantic",
            "summary": "Top semantic bridges between local notes.",
            "bridges": bridges,
            "artifacts": []
        }
        json.dump(report_data, f, indent=2)

    metrics = {
        "evidence_id": "EVD-NOTES-METRIC-001",
        "metrics": {
            "num_notes": float(len(set(n["doc_id"] for n in notes))),
            "num_chunks": float(len(notes)),
            "num_bridges": float(len(bridges)),
            "avg_similarity": float(sum(b["similarity_score"] for b in bridges) / len(bridges)) if bridges else 0.0
        }
    }
    metrics_path = os.path.join(args.out_dir, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    # 4. Report
    generator = ReportGenerator()
    report_md = generator.generate_markdown(bridges)
    report_path = os.path.join(args.out_dir, "report.md")
    with open(report_path, "w") as f:
        f.write(report_md)

    # 5. Stamp (Deterministic metadata)
    stamp = {
        "evidence_id": "EVD-NOTES-STAMP-001",
        "created_utc": "2025-01-01T00:00:00Z",
        "git_commit": "0000000000000000000000000000000000000000",
        "model_name": provider.model_name,
        "chunker_version": "v1.0.0",
        "embedding_fingerprint": provider.get_fingerprint(),
        "notes_hash": hashlib.sha256(str(sorted([n["content"] for n in notes])).encode()).hexdigest()
    }
    stamp_path = os.path.join(args.out_dir, "stamp.json")
    with open(stamp_path, "w") as f:
        json.dump(stamp, f, indent=2)

    print(f"Artifacts generated in {args.out_dir}")

if __name__ == "__main__":
    main()
