"""Synthetic throughput benchmark for the feed processor."""

from __future__ import annotations

import argparse
import asyncio
import json
import random
import time
from pathlib import Path
from typing import Any, Optional

from ..config import Settings
from ..processor import FeedProcessor
from ..queue import RedisBatchQueue
from ..tracing import configure_tracing

DATASET_SOURCES = ["osint", "signals", "geospatial", "social", "darknet"]


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Benchmark feed processor throughput")
    parser.add_argument("--records", type=int, default=20000, help="Total synthetic records")
    parser.add_argument("--batch-size", type=int, default=500, help="Batch size for workers")
    parser.add_argument(
        "--concurrency", type=int, default=4, help="Number of parallel async workers"
    )
    parser.add_argument(
        "--parallelism", type=int, default=8, help="Thread pool size for per-record transforms"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent / "benchmark_results.json",
        help="Where to write benchmark results",
    )
    parser.add_argument(
        "--queue",
        default="feed:benchmark",
        help="Redis queue name to use for the benchmark",
    )
    return parser


def make_record(identifier: int) -> dict[str, Any]:
    return {
        "id": identifier,
        "source": random.choice(DATASET_SOURCES),
        "payload": {
            "title": f"Synthetic Feed {identifier}",
            "body": "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
            "confidence": random.random(),
        },
        "ingested_at": time.time(),
    }


async def enqueue_dataset(queue: RedisBatchQueue, total: int, batch_size: int) -> None:
    chunk_size = min(batch_size * 4, 2000)
    for start in range(0, total, chunk_size):
        end = min(start + chunk_size, total)
        await queue.enqueue_many(make_record(idx) for idx in range(start, end))


async def run_benchmark(settings: Settings, args: argparse.Namespace) -> dict[str, Any]:
    queue = RedisBatchQueue(settings.redis_url, args.queue)
    await queue.purge()

    processor_settings = settings.model_copy(
        update={
            "batch_size": args.batch_size,
            "worker_concurrency": args.concurrency,
            "processing_workers": args.parallelism,
            "queue_name": args.queue,
        }
    )

    processor = FeedProcessor(queue, processor_settings)
    tracer_provider = configure_tracing(processor_settings)

    async def _drain() -> None:
        await processor.run()

    try:
        runner = asyncio.create_task(_drain())
        await enqueue_dataset(queue, args.records, args.batch_size)

        # Wait for the queue to drain
        while processor.metrics.total_records < args.records:
            await asyncio.sleep(0.5)
        processor.stop()
        await runner

        snapshot = processor.metrics.snapshot()
        snapshot.update(
            {
                "batch_size": args.batch_size,
                "records": args.records,
                "worker_concurrency": args.concurrency,
                "parallelism": args.parallelism,
                "queue": args.queue,
            }
        )
        return snapshot
    finally:
        if tracer_provider:
            tracer_provider.shutdown()
        await queue.close()


def main(argv: Optional[list[str]] = None) -> None:
    parser = build_argument_parser()
    args = parser.parse_args(argv)
    base_settings = Settings()
    results = asyncio.run(run_benchmark(base_settings, args))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(results, indent=2))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
