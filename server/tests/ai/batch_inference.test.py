import pytest
import asyncio
import json
from unittest.mock import MagicMock, AsyncMock, patch
from server.src.ai.batchProcessor import BatchProcessor

@pytest.mark.asyncio
async def test_batch_processor_logic():
    # Mock Redis
    mock_redis = MagicMock()
    mock_redis.lpop = AsyncMock(return_value=None)
    mock_redis.pipeline = MagicMock()

    # Setup processor with mocks
    with patch('server.src.ai.batchProcessor.redis.from_url', return_value=mock_redis):
        processor = BatchProcessor()
        processor.queues = {"test_model": []}

        # Test batching trigger
        jobs = [{"id": f"job_{i}", "input": i, "model": "test_model"} for i in range(5)]

        # Manually process a batch
        await processor.process_batch("test_model", jobs)

        # Verify redis set was called for results
        assert mock_redis.pipeline.return_value.__aenter__.return_value.set.call_count == 5

@pytest.mark.asyncio
async def test_model_specific_output():
    mock_redis = MagicMock()
    with patch('server.src.ai.batchProcessor.redis.from_url', return_value=mock_redis):
        processor = BatchProcessor()

        # Test YOLO mock
        yolo_res = await processor.mock_inference("yolo", ["image_data"])
        assert "detections" in yolo_res[0]

        # Test Whisper mock
        whisper_res = await processor.mock_inference("whisper", ["audio_data"])
        assert "text" in whisper_res[0]
