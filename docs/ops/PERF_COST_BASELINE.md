📊 Summit Performance & Cost Measurement
========================================
Time: 2026-01-10T00:52:49.613Z
Repo: /app

🔹 Configuration Check
   - performance-budgets.json: [FOUND]
   - cost-baseline.json:       [FOUND]
   - metrics.json:             [FOUND]

🔹 Latency Budgets (Defined in performance-budgets.json)
   - /health                   [CRITICAL] p95: 50ms | p99: 100ms
   - /health/ready             [CRITICAL] p95: 100ms | p99: 200ms
   - /graphql                  [CRITICAL] p95: 300ms | p99: 800ms
   - /api/v1/entities          [Standard] p95: 250ms | p99: 600ms
   - /api/v1/entities/{id}     [Standard] p95: 150ms | p99: 400ms
   - /api/v1/search            [Standard] p95: 500ms | p99: 1200ms
   - /api/v1/analytics         [Standard] p95: 800ms | p99: 2000ms
   - /metrics                  [Standard] p95: 100ms | p99: 250ms
   - /api/v1/auth/login        [CRITICAL] p95: 300ms | p99: 800ms
   - /api/v1/auth/refresh      [CRITICAL] p95: 100ms | p99: 300ms

🔹 Artifact Size
   - Baseline (metrics.json): 4.88 MB
   - Measured (dist/):        Not found (run 'npm run build:server' to measure)

🔹 Cost Posture
   - Target Hourly Cost:      $60.50
   - Allowed Drift:           5%
   - Status:                  MODELED (Static Baseline from cost-baseline.json)

✅ Report saved to: perf-cost-report.json
