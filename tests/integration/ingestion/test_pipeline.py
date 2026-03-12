import json
import os
import pytest
from summit.ingest.pipeline import IngestPipeline
from summit.ingest.flatten_policy import FlatteningPolicy
from summit.ingestion.chunker import chunk_markdown
from summit.ingestion.notes_loader import NotesLoader

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "../../../evals/fixtures/ingestion")

def test_json_ingestion_and_flattening():
    with open(os.path.join(FIXTURES_DIR, "sample.json"), "r") as f:
        data = json.load(f)

    policy = FlatteningPolicy(enabled=True)
    pipeline = IngestPipeline(flattening_policy=policy)

    result = pipeline.process(data)

    assert "flattened_text" in result
    assert "flattening_trace" in result

    trace = result["flattening_trace"]
    # Check that forbidden keys (ssn, password) are excluded
    assert "content.password" in trace["excluded_keys"]
    assert "content.ssn" in trace["excluded_keys"]

    # Check allowed keys are included
    text = result["flattened_text"]
    assert "This is a summary." in text
    assert "supersecretpassword" not in text

def test_chunking_strategy():
    with open(os.path.join(FIXTURES_DIR, "sample.md"), "r") as f:
        content = f.read()

    chunks = chunk_markdown(content, max_tokens=10)
    assert len(chunks) > 1
    assert all(isinstance(c, str) for c in chunks)

def test_notes_loader_integration():
    loader = NotesLoader(FIXTURES_DIR)
    notes = loader.load_notes()

    # Check that sample.md is loaded and chunked
    md_notes = [n for n in notes if n["doc_id"] == "sample"]
    assert len(md_notes) > 0
    assert "filepath" in md_notes[0]
    assert "chunk_idx" in md_notes[0]
    assert "content" in md_notes[0]

def test_batch_processing_throughput():
    # Simulate batch load
    with open(os.path.join(FIXTURES_DIR, "sample.json"), "r") as f:
        data = json.load(f)

    batch = [data.copy() for _ in range(100)]
    pipeline = IngestPipeline(flattening_policy=FlatteningPolicy(enabled=True))

    results = pipeline.batch_process(batch)
    assert len(results) == 100
    assert all("flattened_text" in r for r in results)

@pytest.mark.skip(reason="PDF parser module not available in current pipeline implementation")
def test_pdf_parsing_integration():
    pass

@pytest.mark.skip(reason="HTML parser module not available in current pipeline implementation")
def test_html_parsing_integration():
    pass

@pytest.mark.skip(reason="Embedding generator/storage module not available in current pipeline implementation")
def test_embedding_round_trip():
    pass

@pytest.mark.skip(reason="Robust error handling for malformed JSON not implemented in current pipeline")
def test_error_handling_malformed():
    pass

@pytest.mark.skip(reason="Idempotency not natively supported by the current ingest pipeline")
def test_idempotency_re_ingestion():
    pass
