import os
import shutil

import pytest

from summit.ingestion.chunker import chunk_markdown
from summit.ingestion.notes_loader import NotesLoader


def test_chunk_markdown():
    text = "Paragraph 1\n\nParagraph 2\n\nParagraph 3"
    chunks = chunk_markdown(text, max_tokens=2)
    assert len(chunks) == 3
    assert "Paragraph 1" in chunks[0]
    assert "Paragraph 2" in chunks[1]
    assert "Paragraph 3" in chunks[2]

def test_notes_loader(tmp_path):
    notes_dir = tmp_path / "notes"
    notes_dir.mkdir()
    (notes_dir / "note1.md").write_text("Hello world\n\nThis is a test.")
    (notes_dir / "note2.md").write_text("Another note.")

    loader = NotesLoader(str(notes_dir))
    notes = loader.load_notes()

    # note1.md and note2.md are small, so each should be 1 chunk with default max_tokens=512
    assert len(notes) == 2
    assert notes[0]["doc_id"] == "note1"
    assert notes[1]["doc_id"] == "note2"
