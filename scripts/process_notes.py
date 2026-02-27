import os, json, hashlib
from summit.ingestion.notes_loader import NotesLoader
from summit.embeddings.local_provider import LocalEmbeddingProvider
from summit.graph.semantic_bridges import SemanticBridgeEngine
from summit.report.generator import ReportGenerator
def main():
    notes_dir, out_dir = "samples/notes", "artifacts"
    os.makedirs(out_dir, exist_ok=True)
    loader = NotesLoader(notes_dir)
    notes = loader.load_notes()
    provider = LocalEmbeddingProvider()
    engine = SemanticBridgeEngine(provider)
    bridges = engine.find_bridges(notes)
    with open(os.path.join(out_dir, "connections.json"), "w") as f:
        json.dump({"evidence_id": "EVD-NOTES-BRIDGE-001", "item_slug": "local-notes-semantic", "summary": "Bridges", "bridges": bridges, "artifacts": []}, f, indent=2)
    with open(os.path.join(out_dir, "metrics.json"), "w") as f:
        json.dump({"evidence_id": "EVD-NOTES-METRIC-001", "metrics": {"num_notes": float(len(set(n["doc_id"] for n in notes)))}}, f, indent=2)
    with open(os.path.join(out_dir, "report.md"), "w") as f:
        f.write(ReportGenerator().generate_markdown(bridges))
    with open(os.path.join(out_dir, "stamp.json"), "w") as f:
        json.dump({"evidence_id": "EVD-NOTES-STAMP-001", "created_utc": "2025-01-01T00:00:00Z", "git_commit": "0"*40, "model_name": provider.model_name, "notes_hash": "stub"}, f, indent=2)
if __name__ == "__main__": main()
