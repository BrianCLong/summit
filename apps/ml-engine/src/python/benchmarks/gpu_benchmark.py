#!/usr/bin/env python3
"""Benchmark utilities for measuring sentence encoder performance."""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sentence_encoder import SentenceEncoder


def _load_corpus(corpus_path: Path) -> List[str]:
    if not corpus_path.exists():
        raise FileNotFoundError(f"Corpus file not found: {corpus_path}")

    return [line.strip() for line in corpus_path.read_text(encoding='utf-8').splitlines() if line.strip()]


def run_benchmark(sample_texts: List[str], devices: List[str], batch_size: int, runs: int) -> Dict[str, Any]:
    results = []

    for device in devices:
        encoder = SentenceEncoder(device_preference=device)
        metrics = encoder.benchmark(sample_texts, runs=runs, warmup_runs=2, batch_size=batch_size)
        metrics['devicePreference'] = device
        results.append(metrics)

    return {
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'model': os.getenv('SENTENCE_TRANSFORMER_MODEL', 'all-MiniLM-L6-v2'),
        'batchSize': batch_size,
        'runs': runs,
        'results': results,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description='GPU benchmark harness for the sentence encoder')
    parser.add_argument('--corpus', type=Path, required=True, help='Path to newline-delimited corpus file')
    parser.add_argument('--devices', nargs='+', default=['cpu', 'cuda'], help='Devices to benchmark (cpu, cuda, mps, etc)')
    parser.add_argument('--batch-size', type=int, default=64, help='Batch size for encode() calls')
    parser.add_argument('--runs', type=int, default=5, help='Number of timed runs per device')
    parser.add_argument('--output', type=Path, help='Optional path to write benchmark results as JSON')

    args = parser.parse_args()

    texts = _load_corpus(args.corpus)
    report = run_benchmark(texts, args.devices, args.batch_size, args.runs)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2), encoding='utf-8')

    print(json.dumps(report))


if __name__ == '__main__':
    main()
