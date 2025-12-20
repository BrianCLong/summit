# Cross-Subsystem Benchmark Suite (Shootout)

This suite compares performance across the three primary languages used in the repository:
- TypeScript (Node.js)
- Python
- Go

## Benchmarks

Each implementation runs the following microbenchmarks:
1.  **Fibonacci (Recursive)**: Tests function call overhead and basic recursion (CPU bound). `fib(35)`
2.  **JSON Parse**: Tests serialization/deserialization speed (Memory/CPU bound). Large object parsing.
3.  **String Concatenation**: Tests memory allocation and string handling.

## Running

Run the harness script:

```bash
./run.sh
```

Results will be printed to stdout and saved to `results.json` (format pending).
