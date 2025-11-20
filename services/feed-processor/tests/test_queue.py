import pytest

from feed_processor.queue import RedisBatchQueue

try:
    import fakeredis.aioredis as fakeredis
except ImportError:  # pragma: no cover
    fakeredis = None


@pytest.mark.asyncio
@pytest.mark.skipif(fakeredis is None, reason="fakeredis is required for queue tests")
async def test_dequeue_batch_uses_batch_size():
    redis = fakeredis.FakeRedis(decode_responses=True)
    queue = RedisBatchQueue("redis://localhost", "test-queue", redis_client=redis)
    await queue.enqueue_many({"value": idx} for idx in range(10))

    batch = await queue.dequeue_batch(batch_size=4, timeout=0.1)
    assert len(batch) == 4
    assert batch[0]["value"] == 0
    assert batch[-1]["value"] == 3

    remaining = await queue.dequeue_batch(batch_size=10, timeout=0.1)
    assert len(remaining) == 6

    await queue.close()
