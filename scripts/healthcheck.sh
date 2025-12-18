#!/usr/bin/env bash

set -euo pipefail

# IntelGraph Platform - Health Check
# Verifies that all core services are running and accepting traffic.

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

TIMEOUT=120
INTERVAL=5

log_check() { echo -ne "Checking $1... "; }
log_ok() { echo -e "${GREEN}OK${NC}"; }
log_fail() { echo -e "${RED}FAIL${NC}"; }
log_wait() { echo -e "${YELLOW}WAITING${NC}"; }

# Services configuration
# Format: "Name|CheckType|Target"
# CheckTypes:
#   - http: Checks for 200 OK
#   - container: Checks Docker health status
#   - port: Checks if port is open (via nc/bash) - fallback if http check fails/unavailable
#   - cmd: Runs a command inside container
SERVICES=(
  "PostgreSQL|container|summit-postgres"
  "Redis|container|summit-redis"
  "Neo4j|container|summit-neo4j"
  "ElasticSearch|container|summit-elasticsearch"
  "API Service|http|http://localhost:4000/health/ready"
  "Web Client|http|http://localhost:3000"
  "Gateway|http|http://localhost:4100/health"
)

echo "Waiting for stack to be healthy (Timeout: ${TIMEOUT}s)..."
START_TIME=$(date +%s)

for service_def in "${SERVICES[@]}"; do
    IFS='|' read -r NAME TYPE TARGET <<< "$service_def"

    IS_HEALTHY=false

    while [ $(($(date +%s) - START_TIME)) -lt $TIMEOUT ]; do
        case "$TYPE" in
            container)
                STATUS=$(docker inspect --format '{{.State.Health.Status}}' "$TARGET" 2>/dev/null || echo "missing")
                if [ "$STATUS" == "healthy" ]; then
                    IS_HEALTHY=true
                fi
                ;;
            http)
                if curl -s -f -o /dev/null "$TARGET"; then
                    IS_HEALTHY=true
                fi
                ;;
        esac

        if [ "$IS_HEALTHY" = true ]; then
            log_check "$NAME"
            log_ok
            break
        fi

        sleep $INTERVAL
    done

    if [ "$IS_HEALTHY" = false ]; then
        log_check "$NAME"
        log_fail
        echo "❌ Error: $NAME failed to become healthy within ${TIMEOUT}s."
        exit 1
    fi
done

echo ""
echo -e "${GREEN}🎉 All systems operational.${NC}"
exit 0
