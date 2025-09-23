#!/usr/bin/env bash
set -euo pipefail
BR=chore/demo-stack-compose
(git checkout -b $BR || git checkout $BR)
FILES="docker-compose.demo.yml observability/prometheus/prometheus.yml observability/alertmanager/alertmanager.yml observability/grafana/provisioning/datasources/prom.yml Makefile"
git add $FILES 2>/dev/null || true
git commit -m "chore(demo): compose stack (Prom, AM, Grafana) + datasources + targets" || echo "Nothing to commit"
echo "Branch $BR ready. Push and open PR."
