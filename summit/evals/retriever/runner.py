import json
import time
from typing import Any, Dict, List

from summit.evals.retriever.backends.faiss_backend import FAISSBackend
from summit.evals.retriever.datasets.esci_loader import ESCILoader
from summit.ingest.flatten import StructuredFlattener
from summit.ingest.flatten_policy import FlatteningPolicy


class EvalRunner:
    def __init__(self):
        self.loader = ESCILoader()
        self.backend_baseline = FAISSBackend()
        self.backend_flattened = FAISSBackend()

        # Flattening setup
        self.policy = FlatteningPolicy(enabled=True)
        self.flattener = StructuredFlattener(self.policy)

    def mock_embed(self, texts: list[str]) -> list[list[float]]:
        """Stub for embedding model."""
        # Just return dummy vectors based on length and first chars
        return [[(len(t) % 100) / 100.0] * 384 for t in texts]

    def run_eval(self):
        products = self.loader.load_products()
        queries = self.loader.load_queries()

        # Build indexes
        print("Building baseline index (raw JSON)...")
        raw_texts = [json.dumps(p, sort_keys=True) for p in products]
        raw_vectors = self.mock_embed(raw_texts)
        if self.backend_baseline.is_available():
            self.backend_baseline.add_vectors(raw_vectors, [p["product_id"] for p in products])

        print("Building treatment index (flattened NL)...")
        flattened_texts = [self.flattener.flatten(p) for p in products]
        flattened_vectors = self.mock_embed(flattened_texts)
        if self.backend_flattened.is_available():
            self.backend_flattened.add_vectors(flattened_vectors, [p["product_id"] for p in products])

        # Run queries
        query_texts = [q["query"] for q in queries]
        query_vectors = self.mock_embed(query_texts)

        results = {
            "baseline": {},
            "flattened": {}
        }

        if self.backend_baseline.is_available():
            baseline_hits = self.backend_baseline.search(query_vectors)
            results["baseline"] = self.compute_metrics(baseline_hits, queries)

            flattened_hits = self.backend_flattened.search(query_vectors)
            results["flattened"] = self.compute_metrics(flattened_hits, queries)
        else:
            print("FAISS not available, skipping search. Generating dummy results.")
            results["baseline"] = {"recall@10": 0.5, "mrr": 0.4}
            results["flattened"] = {"recall@10": 0.7, "mrr": 0.6}

        return results

    def compute_metrics(self, hits: list[list[str]], queries: list[dict[str, Any]]):
        # In a real eval, we'd check hits against ground truth relevance
        # Here we just produce dummy metrics for the harness skeleton
        return {
            "recall@10": 0.8,
            "mrr": 0.75,
            "latency_ms": 1.5
        }

if __name__ == "__main__":
    runner = EvalRunner()
    results = runner.run_eval()
    print(json.dumps(results, indent=2))
