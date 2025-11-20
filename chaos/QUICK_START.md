# 🚀 Resilience Lab - Quick Start Guide

Get started with chaos engineering in 5 minutes!

## Prerequisites Check

```bash
# Verify dependencies
command -v docker && echo "✓ Docker installed" || echo "✗ Install Docker"
command -v docker-compose && echo "✓ Docker Compose installed" || echo "✗ Install Docker Compose"
command -v jq && echo "✓ jq installed" || echo "✗ Install jq"
command -v curl && echo "✓ curl installed" || echo "✗ Install curl"
```

## 1. Start the Stack (2 minutes)

```bash
# Start full chaos testing environment
make chaos-up

# Wait for services to be healthy (check status)
docker-compose -f compose/docker-compose.yml -f compose/docker-compose.chaos.yml ps
```

You should see:
- ✓ postgres (healthy)
- ✓ neo4j (healthy)
- ✓ mc (running)
- ✓ prom (running)
- ✓ grafana (running)

## 2. Run Your First Chaos Test (1 minute)

```bash
# Run smoke suite (safest option)
make chaos:smoke
```

Watch the output for:
- ✓ Pre-chaos health check
- 🔥 Chaos execution
- ⏱️ Recovery measurement
- ✅ Pass/Fail status

## 3. View Results (1 minute)

```bash
# Find the latest report
ls -lth artifacts/chaos/reports/ | head -5

# Open HTML report in browser
open artifacts/chaos/reports/suite_smoke_suite_*.html

# Or view JSON summary
cat artifacts/chaos/reports/suite_smoke_suite_*.json | jq '.summary'
```

## 4. Validate SLOs (30 seconds)

```bash
# Check if system meets SLO targets
make chaos:validate-slos
```

Expected output:
```
[SUCCESS] Availability: 98% (SLO: ≥95%)
[SUCCESS] Error Rate: 2% (SLO: ≤5%)
[SUCCESS] P95 Latency: 245ms (SLO: ≤500ms)
```

## 5. Explore Dashboards (30 seconds)

```bash
# Open Grafana
open http://localhost:3001
# Login: admin / admin

# Open Prometheus
open http://localhost:9090
```

## Common Commands Cheat Sheet

```bash
# Stack Management
make chaos-up          # Start chaos stack
make chaos-down        # Stop chaos stack

# Run Tests
make chaos:smoke       # Quick smoke test (2 scenarios)
make chaos:full        # Full suite (6 scenarios)
make chaos:dry-run     # Test without executing chaos

# Individual Scenarios
./chaos/runner.sh --scenario kill-graphql-api
./chaos/runner.sh --scenario kill-postgres
./chaos/runner.sh --scenario network-latency-db

# Validation
make chaos:validate-slos    # Check SLO compliance

# Reports
ls artifacts/chaos/reports/                        # List reports
open artifacts/chaos/reports/suite_*.html          # View latest
```

## Scenario Quick Reference

| Scenario | Severity | Duration | What It Tests |
|----------|----------|----------|---------------|
| `kill-graphql-api` | Critical | 45s | High availability, auto-restart |
| `kill-postgres` | High | 60s | Database resilience |
| `kill-neo4j` | High | 60s | Graph DB resilience |
| `network-latency-db` | Medium | 120s | Timeout handling |
| `cpu-stress` | Medium | 90s | Resource limits |
| `memory-stress` | Medium | 60s | OOM handling |

## Troubleshooting Quick Fixes

**Services won't start:**
```bash
make chaos-down
docker system prune -f
make chaos-up
```

**Chaos test fails:**
```bash
# Check service health first
docker-compose -f compose/docker-compose.yml \
               -f compose/docker-compose.chaos.yml ps

# View service logs
docker-compose -f compose/docker-compose.yml \
               -f compose/docker-compose.chaos.yml logs mc

# Run in dry-run mode to test
make chaos:dry-run
```

**Can't find reports:**
```bash
# Create directories
mkdir -p artifacts/chaos/reports artifacts/chaos/temp

# Check permissions
ls -la artifacts/chaos/
```

## Next Steps

Once you're comfortable:

1. **Schedule Regular Tests**
   ```bash
   # Add to crontab for nightly runs
   0 2 * * 1-5 cd /path/to/summit && make chaos:smoke
   ```

2. **Integrate with CI/CD**
   - See `chaos/README.md` for GitHub Actions / GitLab CI examples

3. **Customize Scenarios**
   - Edit `chaos/scenarios.yaml`
   - Add your own chaos tests

4. **Monitor Trends**
   - Track recovery times over weeks
   - Identify degradation patterns

## Getting Help

- 📖 Full docs: `chaos/README.md`
- 📊 View reports: `artifacts/chaos/reports/`
- 🔍 Check logs: `docker-compose logs`
- 🎯 Grafana: http://localhost:3001
- 📈 Prometheus: http://localhost:9090

**Pro Tip:** Run `make chaos:dry-run` before any new scenario to verify it won't cause issues!

---

Ready to make Summit more resilient? Start with `make chaos:smoke` now! 🔥
