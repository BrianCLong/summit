import argparse
import time
import asyncio
import logging
from server.src.ai.batchProcessor import BatchProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Benchmark")

async def run_benchmark(batch_sizes):
    logger.info(f"Starting benchmark with batch sizes: {batch_sizes}")
    processor = BatchProcessor()
    # Mock redis for benchmark to avoid dependency
    processor.redis = None

    # Override process_batch to just measure time without redis
    original_process = processor.process_batch

    async def measured_process(model, batch):
        start = time.time()
        # Mock inference direct call
        await processor.mock_inference(model, [b['input'] for b in batch])
        duration = time.time() - start
        return duration

    processor.process_batch = measured_process

    results = {}

    for size in batch_sizes:
        logger.info(f"Testing batch size: {size}")
        batch = [{"id": i, "input": "test", "model": "yolo"} for i in range(size)]

        start_total = time.time()
        # Process 10 batches
        for _ in range(10):
            await processor.mock_inference("yolo", [b['input'] for b in batch])

        total_time = time.time() - start_total
        throughput = (size * 10) / total_time
        results[size] = throughput
        logger.info(f"Batch Size {size}: {throughput:.2f} req/s")

    print("\nBenchmark Results:")
    print("Batch Size | Throughput (req/s)")
    print("-----------|-------------------")
    for size, tput in results.items():
        print(f"{size:<10} | {tput:.2f}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-sizes", type=str, default="1,8,16,32")
    args = parser.parse_args()

    sizes = [int(s) for s in args.batch_sizes.split(",")]
    asyncio.run(run_benchmark(sizes))
