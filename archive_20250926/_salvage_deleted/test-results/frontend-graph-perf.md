# Frontend Graph Performance

## Synthetic Dataset Metrics

| dataset            | initial render (s) | p95 pan/zoom (ms) |
| ------------------ | ------------------ | ----------------- |
| baseline 10k/20k   | 5.3                | 42                |
| optimized 10k/20k  | 1.8                | 14                |
| optimized 50k/100k | 8.9                | 30                |

Metrics captured using Lighthouse Performance and a simple FPS probe in dev build.
