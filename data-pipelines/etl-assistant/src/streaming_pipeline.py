"""Streaming ETL pipeline with enrichment support."""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

from .enrichers import (
    BaseEnricher,
    EnrichmentContext,
    EnricherResult,
    ExifScrubEnricher,
    GeoIPEnricher,
    HashingEnricher,
    LanguageEnricher,
    OCREnricher,
    STTEnricher,
)

logger = logging.getLogger(__name__)


@dataclass
class PipelineMetrics:
    """Metrics for pipeline execution."""

    records_processed: int = 0
    records_succeeded: int = 0
    records_failed: int = 0
    total_duration_ms: float = 0.0
    enrichments_applied: int = 0
    enrichment_duration_ms: float = 0.0
    errors: List[str] = field(default_factory=list)


@dataclass
class PipelineConfig:
    """Configuration for streaming pipeline."""

    tenant_id: str
    source_name: str
    source_type: str
    batch_size: int = 100
    max_workers: int = 4
    enable_enrichers: bool = True
    enricher_config: Dict[str, Any] = field(default_factory=dict)
    emit_provenance: bool = True
    backpressure_threshold: int = 1000


class StreamingETLPipeline:
    """
    Streaming ETL pipeline with enrichment support.

    Features:
    - Asynchronous processing
    - Pluggable enrichers
    - Backpressure handling
    - Provenance emission
    - Metrics collection
    """

    def __init__(self, config: PipelineConfig):
        self.config = config
        self.metrics = PipelineMetrics()
        self.enrichers: List[BaseEnricher] = []
        self.provenance_handler: Optional[Callable] = None
        self.error_handler: Optional[Callable] = None

        # Initialize enrichers if enabled
        if self.config.enable_enrichers:
            self._init_enrichers()

        logger.info(
            f"Initialized StreamingETLPipeline for {config.source_name} "
            f"with {len(self.enrichers)} enrichers"
        )

    def _init_enrichers(self):
        """Initialize enrichers based on configuration."""
        enricher_config = self.config.enricher_config

        # GeoIP enricher
        if enricher_config.get('geoip', {}).get('enabled', True):
            self.enrichers.append(GeoIPEnricher(enricher_config.get('geoip', {})))

        # Language enricher
        if enricher_config.get('language', {}).get('enabled', True):
            self.enrichers.append(LanguageEnricher(enricher_config.get('language', {})))

        # Hashing enricher
        if enricher_config.get('hashing', {}).get('enabled', True):
            self.enrichers.append(HashingEnricher(enricher_config.get('hashing', {})))

        # EXIF scrub enricher
        if enricher_config.get('exif_scrub', {}).get('enabled', False):
            self.enrichers.append(ExifScrubEnricher(enricher_config.get('exif_scrub', {})))

        # OCR enricher
        if enricher_config.get('ocr', {}).get('enabled', False):
            self.enrichers.append(OCREnricher(enricher_config.get('ocr', {})))

        # STT enricher
        if enricher_config.get('stt', {}).get('enabled', False):
            self.enrichers.append(STTEnricher(enricher_config.get('stt', {})))

        logger.info(f"Initialized {len(self.enrichers)} enrichers")

    def set_provenance_handler(self, handler: Callable[[Dict[str, Any]], None]):
        """Set handler for provenance events."""
        self.provenance_handler = handler

    def set_error_handler(self, handler: Callable[[Exception, Dict[str, Any]], None]):
        """Set handler for errors."""
        self.error_handler = handler

    async def process_stream(
        self, records: asyncio.Queue, output_queue: Optional[asyncio.Queue] = None
    ) -> PipelineMetrics:
        """
        Process a stream of records through the pipeline.

        Args:
            records: Input queue of records
            output_queue: Optional output queue for enriched records

        Returns:
            Pipeline metrics
        """
        start_time = time.time()

        # Create output queue if not provided
        if output_queue is None:
            output_queue = asyncio.Queue()

        # Process records in batches
        tasks = []
        batch = []

        while True:
            try:
                # Get record with timeout
                record = await asyncio.wait_for(records.get(), timeout=1.0)

                if record is None:  # Sentinel value for end of stream
                    break

                batch.append(record)

                # Process batch when full
                if len(batch) >= self.config.batch_size:
                    task = asyncio.create_task(self._process_batch(batch, output_queue))
                    tasks.append(task)
                    batch = []

                    # Backpressure: limit concurrent tasks
                    if len(tasks) >= self.config.max_workers:
                        await asyncio.gather(*tasks)
                        tasks = []

            except asyncio.TimeoutError:
                # No more records available, process remaining batch
                if batch:
                    task = asyncio.create_task(self._process_batch(batch, output_queue))
                    tasks.append(task)
                    batch = []
                break

        # Process any remaining records
        if batch:
            task = asyncio.create_task(self._process_batch(batch, output_queue))
            tasks.append(task)

        # Wait for all tasks to complete
        if tasks:
            await asyncio.gather(*tasks)

        self.metrics.total_duration_ms = (time.time() - start_time) * 1000

        logger.info(
            f"Pipeline completed: {self.metrics.records_processed} records processed, "
            f"{self.metrics.records_succeeded} succeeded, {self.metrics.records_failed} failed"
        )

        return self.metrics

    async def _process_batch(
        self, batch: List[Dict[str, Any]], output_queue: asyncio.Queue
    ) -> None:
        """Process a batch of records."""
        tasks = [self._process_record(record, output_queue) for record in batch]
        await asyncio.gather(*tasks)

    async def _process_record(
        self, record: Dict[str, Any], output_queue: asyncio.Queue
    ) -> None:
        """Process a single record through the pipeline."""
        self.metrics.records_processed += 1

        try:
            # Create enrichment context
            context = EnrichmentContext(
                tenant_id=self.config.tenant_id,
                source_name=self.config.source_name,
                record_id=record.get('id'),
                metadata={
                    'source_type': self.config.source_type,
                },
            )

            # Apply enrichers
            enriched_record = record.copy()
            enrichment_results = []

            for enricher in self.enrichers:
                if enricher.can_enrich(enriched_record):
                    result = enricher.enrich_with_timing(enriched_record, context)
                    enrichment_results.append(result)

                    if result.success:
                        # Merge enriched data
                        enriched_record.update(result.enriched_data)
                        self.metrics.enrichments_applied += 1
                        self.metrics.enrichment_duration_ms += result.duration_ms
                    else:
                        logger.warning(
                            f"Enricher {enricher.__class__.__name__} failed: {result.errors}"
                        )

            # Add enrichment metadata
            enriched_record['_enrichment_metadata'] = {
                'enrichers_applied': len(enrichment_results),
                'enrichment_duration_ms': sum(r.duration_ms for r in enrichment_results),
                'enrichment_timestamp': time.time(),
            }

            # Emit provenance event
            if self.config.emit_provenance and self.provenance_handler:
                provenance_event = self._create_provenance_event(
                    record, enriched_record, context, enrichment_results
                )
                self.provenance_handler(provenance_event)

            # Put enriched record in output queue
            await output_queue.put(enriched_record)

            self.metrics.records_succeeded += 1

        except Exception as e:
            self.metrics.records_failed += 1
            self.metrics.errors.append(str(e))
            logger.error(f"Error processing record: {e}", exc_info=True)

            if self.error_handler:
                self.error_handler(e, record)

    def _create_provenance_event(
        self,
        original_record: Dict[str, Any],
        enriched_record: Dict[str, Any],
        context: EnrichmentContext,
        enrichment_results: List[EnricherResult],
    ) -> Dict[str, Any]:
        """Create a provenance event for record processing."""
        return {
            'event_type': 'etl_enrichment',
            'tenant_id': context.tenant_id,
            'source_name': context.source_name,
            'record_id': context.record_id,
            'timestamp': time.time(),
            'enrichers_applied': [
                {
                    'enricher': type(enricher).__name__,
                    'success': result.success,
                    'duration_ms': result.duration_ms,
                    'warnings': result.warnings,
                }
                for enricher, result in zip(self.enrichers, enrichment_results)
            ],
            'original_hash': self._hash_record(original_record),
            'enriched_hash': self._hash_record(enriched_record),
        }

    def _hash_record(self, record: Dict[str, Any]) -> str:
        """Generate hash of record for provenance."""
        import hashlib
        import json

        content = json.dumps(record, sort_keys=True, default=str)
        return hashlib.sha256(content.encode('utf-8')).hexdigest()

    def get_enricher_metrics(self) -> Dict[str, Any]:
        """Get metrics for all enrichers."""
        return {
            enricher.__class__.__name__: enricher.get_metrics() for enricher in self.enrichers
        }


async def example_usage():
    """Example usage of streaming pipeline."""
    # Create pipeline config
    config = PipelineConfig(
        tenant_id='tenant_123',
        source_name='example_source',
        source_type='csv',
        batch_size=10,
        max_workers=4,
        enable_enrichers=True,
        enricher_config={
            'geoip': {'enabled': True},
            'language': {'enabled': True},
            'hashing': {'enabled': True, 'hash_all_content': True},
        },
    )

    # Create pipeline
    pipeline = StreamingETLPipeline(config)

    # Create input and output queues
    input_queue = asyncio.Queue()
    output_queue = asyncio.Queue()

    # Add sample records to input queue
    sample_records = [
        {
            'id': '1',
            'name': 'John Doe',
            'ip': '8.8.8.8',
            'text': 'Hello, this is a test message.',
        },
        {
            'id': '2',
            'name': 'Jane Smith',
            'ip': '1.1.1.1',
            'text': 'Bonjour, ceci est un message de test.',
        },
        {
            'id': '3',
            'name': 'Bob Johnson',
            'source_ip': '192.168.1.1',
            'content': 'This is some content to hash.',
        },
    ]

    for record in sample_records:
        await input_queue.put(record)

    # Add sentinel to signal end of stream
    await input_queue.put(None)

    # Process stream
    metrics = await pipeline.process_stream(input_queue, output_queue)

    # Print results
    print(f"\n=== Pipeline Metrics ===")
    print(f"Records processed: {metrics.records_processed}")
    print(f"Records succeeded: {metrics.records_succeeded}")
    print(f"Records failed: {metrics.records_failed}")
    print(f"Total duration: {metrics.total_duration_ms:.2f}ms")
    print(f"Enrichments applied: {metrics.enrichments_applied}")

    print(f"\n=== Enricher Metrics ===")
    for enricher_name, enricher_metrics in pipeline.get_enricher_metrics().items():
        print(f"{enricher_name}:")
        print(f"  Total: {enricher_metrics['total_enrichments']}")
        print(f"  Success: {enricher_metrics['successful_enrichments']}")
        print(f"  Avg duration: {enricher_metrics['average_duration_ms']:.2f}ms")

    # Get enriched records from output queue
    print(f"\n=== Sample Enriched Records ===")
    while not output_queue.empty():
        enriched_record = await output_queue.get()
        print(f"\nRecord {enriched_record['id']}:")
        print(f"  Original: {enriched_record.get('name')}")
        if 'geo' in enriched_record:
            print(f"  Geo enrichment: {enriched_record['geo']}")
        if 'language' in enriched_record:
            print(f"  Language enrichment: {enriched_record['language']}")
        if 'hashes' in enriched_record:
            print(f"  Content hash: {enriched_record['hashes'].get('content_hash', {}).get('sha256', 'N/A')[:16]}...")


if __name__ == '__main__':
    asyncio.run(example_usage())
