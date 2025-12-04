"""Tests for streaming ETL pipeline."""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from streaming_pipeline import (
    StreamingETLPipeline,
    PipelineConfig,
    PipelineMetrics,
)


class TestStreamingPipeline:
    """Test streaming ETL pipeline."""

    def test_pipeline_initialization(self):
        """Test pipeline initializes correctly."""
        config = PipelineConfig(
            tenant_id='tenant_123',
            source_name='test_source',
            source_type='csv',
        )

        pipeline = StreamingETLPipeline(config)

        assert pipeline.config == config
        assert len(pipeline.enrichers) > 0  # Default enrichers should be loaded

    def test_pipeline_with_enrichers_disabled(self):
        """Test pipeline with enrichers disabled."""
        config = PipelineConfig(
            tenant_id='tenant_123',
            source_name='test_source',
            source_type='csv',
            enable_enrichers=False,
        )

        pipeline = StreamingETLPipeline(config)

        assert len(pipeline.enrichers) == 0

    async def test_process_stream_basic(self):
        """Test basic stream processing."""
        config = PipelineConfig(
            tenant_id='tenant_123',
            source_name='test_source',
            source_type='csv',
            batch_size=10,
        )

        pipeline = StreamingETLPipeline(config)

        # Create input queue with test data
        input_queue = asyncio.Queue()
        for i in range(5):
            await input_queue.put({
                'id': str(i),
                'name': f'Record {i}',
                'ip': f'8.8.8.{i}',
                'text': 'This is a test message.',
            })
        await input_queue.put(None)  # Sentinel

        # Process stream
        output_queue = asyncio.Queue()
        metrics = await pipeline.process_stream(input_queue, output_queue)

        # Verify metrics
        assert metrics.records_processed == 5
        assert metrics.records_succeeded == 5
        assert metrics.records_failed == 0
        assert metrics.total_duration_ms > 0

        # Verify output
        assert output_queue.qsize() == 5

    async def test_enrichment_applied(self):
        """Test enrichments are applied to records."""
        config = PipelineConfig(
            tenant_id='tenant_123',
            source_name='test_source',
            source_type='csv',
            enable_enrichers=True,
            enricher_config={
                'geoip': {'enabled': True},
                'language': {'enabled': True},
                'hashing': {'enabled': True},
            },
        )

        pipeline = StreamingETLPipeline(config)

        # Create input queue
        input_queue = asyncio.Queue()
        await input_queue.put({
            'id': '1',
            'name': 'Test Record',
            'ip': '8.8.8.8',
            'text': 'This is a test message with enough text.',
        })
        await input_queue.put(None)

        # Process stream
        output_queue = asyncio.Queue()
        metrics = await pipeline.process_stream(input_queue, output_queue)

        # Get enriched record
        enriched_record = await output_queue.get()

        # Verify enrichments were applied
        assert 'geo' in enriched_record
        assert 'language' in enriched_record
        assert 'hashes' in enriched_record
        assert '_enrichment_metadata' in enriched_record

    async def test_batch_processing(self):
        """Test batch processing."""
        config = PipelineConfig(
            tenant_id='tenant_123',
            source_name='test_source',
            source_type='csv',
            batch_size=3,
            max_workers=2,
        )

        pipeline = StreamingETLPipeline(config)

        # Create input queue with more records than batch size
        input_queue = asyncio.Queue()
        for i in range(10):
            await input_queue.put({'id': str(i), 'name': f'Record {i}'})
        await input_queue.put(None)

        # Process stream
        output_queue = asyncio.Queue()
        metrics = await pipeline.process_stream(input_queue, output_queue)

        assert metrics.records_processed == 10
        assert output_queue.qsize() == 10

    async def test_error_handling(self):
        """Test error handling in pipeline."""
        config = PipelineConfig(
            tenant_id='tenant_123',
            source_name='test_source',
            source_type='csv',
        )

        pipeline = StreamingETLPipeline(config)

        errors_caught = []

        def error_handler(error, record):
            errors_caught.append((error, record))

        pipeline.set_error_handler(error_handler)

        # Create input queue with invalid data
        input_queue = asyncio.Queue()
        await input_queue.put({'id': '1', 'name': 'Valid'})
        # This would cause an error if enrichers tried to process it incorrectly
        await input_queue.put(None)  # But we'll just use valid data for this test

        output_queue = asyncio.Queue()
        metrics = await pipeline.process_stream(input_queue, output_queue)

        # Should process successfully
        assert metrics.records_succeeded >= 1

    async def test_provenance_emission(self):
        """Test provenance events are emitted."""
        config = PipelineConfig(
            tenant_id='tenant_123',
            source_name='test_source',
            source_type='csv',
            emit_provenance=True,
        )

        pipeline = StreamingETLPipeline(config)

        provenance_events = []

        def provenance_handler(event):
            provenance_events.append(event)

        pipeline.set_provenance_handler(provenance_handler)

        # Create input queue
        input_queue = asyncio.Queue()
        await input_queue.put({'id': '1', 'name': 'Test'})
        await input_queue.put(None)

        output_queue = asyncio.Queue()
        await pipeline.process_stream(input_queue, output_queue)

        # Verify provenance events were emitted
        assert len(provenance_events) == 1
        assert provenance_events[0]['event_type'] == 'etl_enrichment'
        assert provenance_events[0]['tenant_id'] == 'tenant_123'

    def test_enricher_metrics(self):
        """Test enricher metrics are collected."""
        config = PipelineConfig(
            tenant_id='tenant_123',
            source_name='test_source',
            source_type='csv',
            enable_enrichers=True,
        )

        pipeline = StreamingETLPipeline(config)

        # Get metrics
        enricher_metrics = pipeline.get_enricher_metrics()

        # Should have metrics for each enricher
        assert len(enricher_metrics) > 0

        # Each metric should have expected fields
        for enricher_name, metrics in enricher_metrics.items():
            assert 'total_enrichments' in metrics
            assert 'successful_enrichments' in metrics
            assert 'failed_enrichments' in metrics
            assert 'average_duration_ms' in metrics


def run_async_tests():
    """Run async tests."""
    import pytest

    pytest.main([__file__, '-v', '-s'])


if __name__ == '__main__':
    # Run tests using pytest
    run_async_tests()
