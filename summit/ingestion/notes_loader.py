import os
from typing import Dict, List

from summit.ingestion.chunker import chunk_markdown


class NotesLoader:
    def __init__(self, notes_dir: str):
        self.notes_dir = notes_dir
    def load_notes(self) -> list[dict]:
        notes = []
        if not os.path.exists(self.notes_dir): return notes
        filenames = sorted(os.listdir(self.notes_dir))
        for filename in filenames:
            if filename.endswith(".md"):
                filepath = os.path.join(self.notes_dir, filename)
                with open(filepath, encoding="utf-8") as f:
                    content = f.read()
                    doc_id = filename.replace(".md", "")
                    chunks = chunk_markdown(content)
                    for idx, chunk in enumerate(chunks):
                        notes.append({"doc_id": doc_id, "chunk_idx": idx, "content": chunk, "filepath": filepath})
        return notes
