"""Asynchronous feed processing workers with batching and parallelism."""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import signal
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Optional

from opentelemetry import trace
from opentelemetry.trace import SpanKind

from .config import Settings
from .metrics import ThroughputTracker
from .queue import RedisBatchQueue

logger = logging.getLogger(__name__)


class FeedProcessor:
    """Consume feed messages from Redis and process them in batches."""

    def __init__(
        self,
        queue: RedisBatchQueue,
        settings: Settings,
        *,
        loop: Optional[asyncio.AbstractEventLoop] = None,
    ) -> None:
        self.settings = settings
        self.queue = queue
        self.loop = loop
        self.metrics = ThroughputTracker(window=50)
        self._tracer = trace.get_tracer(__name__)
        self._stop_event = asyncio.Event()
        self._running = False
        self._executor = ThreadPoolExecutor(max_workers=settings.processing_workers)

    async def run(self) -> None:
        """Start worker tasks and block until :meth:`stop` is called."""

        if self._running:
            raise RuntimeError("FeedProcessor is already running")
        if self.loop is None:
            self.loop = asyncio.get_running_loop()
        self._running = True
        worker_tasks = [
            asyncio.create_task(self._worker_loop(worker_id), name=f"feed-worker-{worker_id}")
            for worker_id in range(self.settings.worker_concurrency)
        ]

        try:
            await self._stop_event.wait()
        finally:
            self._running = False
            for task in worker_tasks:
                task.cancel()
            await asyncio.gather(*worker_tasks, return_exceptions=True)
            self._executor.shutdown(wait=True, cancel_futures=True)

    def stop(self) -> None:
        """Signal the processor to shut down."""

        self._stop_event.set()

    async def _worker_loop(self, worker_id: int) -> None:
        tracer = self._tracer
        queue = self.queue
        settings = self.settings
        idle_timeout = settings.dequeue_timeout

        while self._running:
            try:
                batch = await queue.dequeue_batch(settings.batch_size, timeout=idle_timeout)
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # pragma: no cover - defensive logging
                logger.exception("Worker %s failed to pull batch", worker_id, exc_info=exc)
                await asyncio.sleep(0.5)
                continue

            if not batch:
                continue

            started_at = time.perf_counter()
            with tracer.start_as_current_span(
                "feed.batch", kind=SpanKind.CONSUMER
            ) as span:
                span.set_attribute("feed.worker.id", worker_id)
                span.set_attribute("feed.batch.size", len(batch))
                results = await self._process_batch(batch, span)
                elapsed = time.perf_counter() - started_at
                self.metrics.record(len(batch), elapsed, started_at)
                span.set_attribute("feed.batch.elapsed_ms", elapsed * 1000)
                span.set_attribute("feed.batch.throughput", len(batch) / max(elapsed, 1e-9))
                span.set_attribute("feed.batch.success_count", len(results))

            await asyncio.sleep(self.settings.flush_interval)

    async def _process_batch(self, batch: list[dict[str, Any]], span) -> list[dict[str, Any]]:
        """Fan out batch processing across a thread pool."""

        loop = self.loop
        results = await asyncio.gather(
            *[
                loop.run_in_executor(
                    self._executor, self._process_record, record, idx, span.get_span_context().trace_id
                )
                for idx, record in enumerate(batch)
            ],
            return_exceptions=True,
        )

        processed: list[dict[str, Any]] = []
        failures = 0
        for result in results:
            if isinstance(result, Exception):
                failures += 1
                logger.exception("Feed record processing failed", exc_info=result)
                continue
            processed.append(result)

        if failures:
            span.add_event("feed.batch.failures", {"count": failures})
        return processed

    def _process_record(self, record: dict[str, Any], index: int, trace_id: int) -> dict[str, Any]:
        """CPU-bound transformation placeholder executed in a worker thread."""

        payload = json.dumps(record, sort_keys=True).encode("utf-8")
        digest = hashlib.sha256(payload).hexdigest()
        return {
            "record": record,
            "digest": digest,
            "position": index,
            "trace_id": trace_id,
            "processed_at": time.time_ns(),
        }


async def run_from_cli(settings: Settings) -> None:
    """Run the processor with signal-aware shutdown for the CLI entrypoint."""

    queue = RedisBatchQueue(settings.redis_url, settings.queue_name)
    processor = FeedProcessor(queue, settings)

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, processor.stop)

    try:
        await processor.run()
    finally:
        await queue.close()
