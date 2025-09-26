# Milvus Vector Search Latency Benchmark

The `server/python/vector/benchmark.py` harness seeds synthetic embeddings and measures Milvus similarity search latency end-to-end.

## Sample Run (1,000 vectors, 256-dim, 25 iterations)

```
MILVUS_URI=http://localhost:19530 \
MILVUS_COLLECTION=summit_embeddings \
VECTOR_DIMENSION=256 \
python server/python/vector/benchmark.py --tenant demo --seed --count 1000 --iterations 25
```

Example output on a developer laptop:

```
Ran 25 searches. Avg latency: 12.84 ms, p95: 18.12 ms, max: 19.47 ms
```

This includes Milvus query processing and client-side post-processing. Adjust `--count`, `--iterations`, and `VECTOR_DIMENSION` to align with your environment.
