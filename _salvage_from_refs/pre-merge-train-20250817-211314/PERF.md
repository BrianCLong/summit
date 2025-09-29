# Graph Rendering Performance

## Reproduction

1. `node scripts/generate-synthetic-graph.js 10000 20000`
2. `npm run dev`
3. Load the generated dataset via `/api/graph` or adjust endpoint to read the file.
4. Run Lighthouse Performance and the built-in FPS probe.

## Results

See `test-results/frontend-graph-perf.md` for metrics. Initial render of 10k nodes/20k edges completes in under 2s with P95 pan/zoom frame times below 16ms.
