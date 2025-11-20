#!/bin/bash
# Summit Agent Gateway Deployment Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${ENVIRONMENT:-staging}"
DRY_RUN="${DRY_RUN:-false}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Summit Agent Gateway Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Dry Run: ${YELLOW}$DRY_RUN${NC}"
echo ""

# ============================================================================
# Pre-flight Checks
# ============================================================================

echo -e "${GREEN}[1/8] Running pre-flight checks...${NC}"

# Check dependencies
command -v node >/dev/null 2>&1 || { echo -e "${RED}Error: node is not installed${NC}" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}Error: npm is not installed${NC}" >&2; exit 1; }
command -v psql >/dev/null 2>&1 || { echo -e "${RED}Error: psql is not installed${NC}" >&2; exit 1; }

# Check required environment variables
if [ -z "$DB_HOST" ]; then
    echo -e "${RED}Error: DB_HOST environment variable is required${NC}"
    exit 1
fi

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}Warning: DB_PASSWORD not set${NC}"
fi

echo -e "${GREEN}✓ Pre-flight checks passed${NC}\n"

# ============================================================================
# Database Backup
# ============================================================================

echo -e "${GREEN}[2/8] Creating database backup...${NC}"

BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
BACKUP_DIR="$PROJECT_ROOT/backups"
mkdir -p "$BACKUP_DIR"

if [ "$DRY_RUN" = "false" ]; then
    PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -U "${DB_USER:-summit}" "${DB_NAME:-summit}" > "$BACKUP_DIR/$BACKUP_FILE"
    echo -e "${GREEN}✓ Backup created: $BACKUP_DIR/$BACKUP_FILE${NC}\n"
else
    echo -e "${YELLOW}[DRY RUN] Would create backup: $BACKUP_DIR/$BACKUP_FILE${NC}\n"
fi

# ============================================================================
# Run Database Migrations
# ============================================================================

echo -e "${GREEN}[3/8] Running database migrations...${NC}"

MIGRATION_FILE="$PROJECT_ROOT/../../db/migrations/017_agent_framework.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

if [ "$DRY_RUN" = "false" ]; then
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "${DB_USER:-summit}" "${DB_NAME:-summit}" -f "$MIGRATION_FILE"
    echo -e "${GREEN}✓ Migrations applied${NC}\n"
else
    echo -e "${YELLOW}[DRY RUN] Would apply migration: $MIGRATION_FILE${NC}\n"
fi

# ============================================================================
# Deploy OPA Policies
# ============================================================================

echo -e "${GREEN}[4/8] Deploying OPA policies...${NC}"

OPA_POLICY_FILE="$PROJECT_ROOT/../../policy/agent/agent_policy.rego"
OPA_ENDPOINT="${OPA_ENDPOINT:-http://localhost:8181}"

if [ ! -f "$OPA_POLICY_FILE" ]; then
    echo -e "${RED}Error: OPA policy file not found: $OPA_POLICY_FILE${NC}"
    exit 1
fi

if [ "$DRY_RUN" = "false" ]; then
    curl -X PUT "$OPA_ENDPOINT/v1/policies/agent" \
        --data-binary "@$OPA_POLICY_FILE" \
        -H "Content-Type: text/plain" \
        || { echo -e "${RED}Error: Failed to deploy OPA policy${NC}"; exit 1; }

    echo -e "${GREEN}✓ OPA policies deployed${NC}\n"
else
    echo -e "${YELLOW}[DRY RUN] Would deploy OPA policy to: $OPA_ENDPOINT${NC}\n"
fi

# ============================================================================
# Install Dependencies
# ============================================================================

echo -e "${GREEN}[5/8] Installing dependencies...${NC}"

cd "$PROJECT_ROOT"

if [ "$DRY_RUN" = "false" ]; then
    npm install --production
    echo -e "${GREEN}✓ Dependencies installed${NC}\n"
else
    echo -e "${YELLOW}[DRY RUN] Would run: npm install --production${NC}\n"
fi

# ============================================================================
# Build Application
# ============================================================================

echo -e "${GREEN}[6/8] Building application...${NC}"

if [ "$DRY_RUN" = "false" ]; then
    npm run build
    echo -e "${GREEN}✓ Application built${NC}\n"
else
    echo -e "${YELLOW}[DRY RUN] Would run: npm run build${NC}\n"
fi

# ============================================================================
# Run Tests
# ============================================================================

echo -e "${GREEN}[7/8] Running tests...${NC}"

if [ "$ENVIRONMENT" != "production" ]; then
    if [ "$DRY_RUN" = "false" ]; then
        NODE_ENV=test npm test || { echo -e "${RED}Error: Tests failed${NC}"; exit 1; }
        echo -e "${GREEN}✓ Tests passed${NC}\n"
    else
        echo -e "${YELLOW}[DRY RUN] Would run: npm test${NC}\n"
    fi
else
    echo -e "${YELLOW}Skipping tests in production${NC}\n"
fi

# ============================================================================
# Start/Restart Service
# ============================================================================

echo -e "${GREEN}[8/8] Starting service...${NC}"

if [ "$DRY_RUN" = "false" ]; then
    # Check if using PM2, systemd, or Docker
    if command -v pm2 >/dev/null 2>&1; then
        echo "Using PM2..."
        pm2 restart agent-gateway || pm2 start dist/server.js --name agent-gateway
    elif command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet agent-gateway; then
        echo "Using systemd..."
        sudo systemctl restart agent-gateway
    else
        echo "Starting directly..."
        npm start &
    fi

    echo -e "${GREEN}✓ Service started${NC}\n"
else
    echo -e "${YELLOW}[DRY RUN] Would start service${NC}\n"
fi

# ============================================================================
# Health Check
# ============================================================================

echo -e "${GREEN}Running health check...${NC}"

if [ "$DRY_RUN" = "false" ]; then
    sleep 3 # Wait for service to start

    HEALTH_URL="http://localhost:${PORT:-3001}/health"
    HEALTH_RESPONSE=$(curl -s "$HEALTH_URL" || echo "failed")

    if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
        echo -e "${GREEN}✓ Health check passed${NC}"
    else
        echo -e "${RED}✗ Health check failed${NC}"
        echo "Response: $HEALTH_RESPONSE"
        exit 1
    fi
else
    echo -e "${YELLOW}[DRY RUN] Would check health at: http://localhost:${PORT:-3001}/health${NC}"
fi

# ============================================================================
# Deployment Complete
# ============================================================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Service URL: http://localhost:${PORT:-3001}"
echo "Health Check: http://localhost:${PORT:-3001}/health"
echo "Backup: $BACKUP_DIR/$BACKUP_FILE"
echo ""
echo "Next steps:"
echo "1. Verify service is running: curl http://localhost:${PORT:-3001}/health"
echo "2. Create first agent: summit-agent create"
echo "3. Monitor logs: pm2 logs agent-gateway (if using PM2)"
echo ""
