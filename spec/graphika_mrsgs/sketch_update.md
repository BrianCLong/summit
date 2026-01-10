# MRSGS Sketch Update

## Streaming update plan

- Maintain incremental updates per time window using sparse matrix sketches.
- Use frequent directions or randomized SVD to bound memory.
- Track per-tier update cost and enforce maximum runtime.

## Update steps

1. Receive edge additions/removals for the current window.
2. Update normalized adjacency approximation.
3. Refresh spectral sketches for each resolution tier.
4. Persist sketch vector along with determinism token.

## Budget enforcement

- If runtime exceeds the window budget, fall back to coarser tiers.
- Emit a budget overrun flag in the artifact metadata.
