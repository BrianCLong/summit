import json
import os
import time
import glob
from difflib import SequenceMatcher
from typing import Any, Dict, List

from summit.ingest.pipeline import IngestPipeline
from summit.ingest.flatten_policy import FlatteningPolicy


def calculate_accuracy(expected: str, actual: str) -> float:
    """Calculate similarity ratio between expected and actual text."""
    matcher = SequenceMatcher(None, expected, actual)
    return matcher.ratio()


def calculate_chunk_stats(text: str) -> Dict[str, float]:
    """Mock chunking statistics to evaluate quality."""
    # Split text roughly by sentences. (In reality, chunks might be overlapping or larger)
    chunks = [chunk.strip() for chunk in text.split(". ") if chunk.strip()]
    if not chunks:
        return {"avg_chunk_size": 0.0, "num_chunks": 0}
    sizes = [len(c) for c in chunks]
    avg_size = sum(sizes) / len(sizes)
    return {
        "avg_chunk_size": avg_size,
        "num_chunks": len(chunks)
    }


def calculate_embedding_coverage(text: str) -> float:
    """Mock embedding coverage (e.g. what percentage of text was embedded).
    Since we don't have an embedding model, we'll assume 100% of non-empty chunks are covered.
    """
    return 1.0 if len(text.strip()) > 0 else 0.0


def run_evaluation():
    print("Initializing evaluation harness...")
    policy = FlatteningPolicy(enabled=True)
    pipeline = IngestPipeline(policy)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    fixtures_dir = os.path.join(base_dir, "fixtures")
    gold_dir = os.path.join(fixtures_dir, "gold")

    fixture_files = sorted(glob.glob(os.path.join(fixtures_dir, "*.json")))
    if not fixture_files:
        print(f"No fixture files found in {fixtures_dir}")
        return

    records = []
    gold_texts = {}

    for filepath in fixture_files:
        with open(filepath, 'r') as f:
            data = json.load(f)
            records.append(data)

        doc_id = os.path.splitext(os.path.basename(filepath))[0]
        gold_path = os.path.join(gold_dir, f"{doc_id}_gold.txt")
        if os.path.exists(gold_path):
            with open(gold_path, 'r') as f:
                gold_texts[doc_id] = f.read().strip()

    num_docs = len(records)
    print(f"Loaded {num_docs} documents for evaluation.")

    # Measure throughput
    start_time = time.perf_counter()
    processed_records = pipeline.batch_process(records)
    end_time = time.perf_counter()

    duration = end_time - start_time
    throughput = num_docs / duration if duration > 0 else float('inf')

    total_accuracy = 0.0
    total_chunks = 0
    total_avg_chunk_size = 0.0
    total_embedding_coverage = 0.0

    docs_with_gold = 0

    for i, processed in enumerate(processed_records):
        doc_id = os.path.splitext(os.path.basename(fixture_files[i]))[0]
        actual_text = processed.get("flattened_text", "")

        # Parse Accuracy
        if doc_id in gold_texts:
            accuracy = calculate_accuracy(gold_texts[doc_id], actual_text)
            total_accuracy += accuracy
            docs_with_gold += 1

        # Chunking Stats
        chunk_stats = calculate_chunk_stats(actual_text)
        total_chunks += chunk_stats["num_chunks"]
        total_avg_chunk_size += chunk_stats["avg_chunk_size"]

        # Embedding Coverage
        coverage = calculate_embedding_coverage(actual_text)
        total_embedding_coverage += coverage

    avg_accuracy = total_accuracy / docs_with_gold if docs_with_gold > 0 else 0.0
    avg_chunk_size = total_avg_chunk_size / num_docs if num_docs > 0 else 0.0
    avg_coverage = total_embedding_coverage / num_docs if num_docs > 0 else 0.0

    print("\n--- Ingestion Pipeline Evaluation Results ---")
    print(f"Total Documents: {num_docs}")
    print(f"Time Taken: {duration:.4f} seconds")
    print(f"Throughput: {throughput:.2f} docs/sec")
    print(f"Parse Accuracy: {avg_accuracy:.2%}")
    print(f"Total Simulated Chunks: {total_chunks}")
    print(f"Average Chunk Size (chars): {avg_chunk_size:.2f}")
    print(f"Simulated Embedding Coverage: {avg_coverage:.2%}")

    # Assertions to fail CI if needed
    assert avg_accuracy >= 0.95, f"Parse accuracy {avg_accuracy} is below threshold 0.95"
    assert throughput > 0, "Throughput must be greater than 0"
    print("All metrics passed threshold validations.")


if __name__ == "__main__":
    run_evaluation()
