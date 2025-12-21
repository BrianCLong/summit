# Load Test Playbook

1. Warm-up with `soak.js` for cache priming.
2. Run `stress.js` while monitoring HPA/VPA recommendations and p95.
3. Validate no error budget burn >1%.
4. Scale to zero workers verified via KEDA cooldown.
