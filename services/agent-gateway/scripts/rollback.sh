#!/bin/bash
# Summit Agent Gateway Rollback Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}========================================${NC}"
echo -e "${RED}Summit Agent Gateway Rollback${NC}"
echo -e "${RED}========================================${NC}"
echo ""

# ============================================================================
# Confirm Rollback
# ============================================================================

echo -e "${YELLOW}WARNING: This will rollback the Agent Gateway deployment${NC}"
echo -e "${YELLOW}This includes:${NC}"
echo "  - Stopping the service"
echo "  - Reverting database changes"
echo "  - Removing OPA policies"
echo ""

read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# ============================================================================
# Select Backup
# ============================================================================

BACKUP_DIR="$PROJECT_ROOT/backups"

if [ -d "$BACKUP_DIR" ]; then
    echo ""
    echo "Available backups:"
    ls -1t "$BACKUP_DIR"/*.sql 2>/dev/null | head -10 || echo "No backups found"
    echo ""
fi

read -p "Enter backup filename (or press Enter to skip DB rollback): " BACKUP_FILE

# ============================================================================
# Stop Service
# ============================================================================

echo -e "\n${GREEN}[1/3] Stopping service...${NC}"

if command -v pm2 >/dev/null 2>&1; then
    pm2 stop agent-gateway || true
elif command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet agent-gateway; then
    sudo systemctl stop agent-gateway
else
    pkill -f "agent-gateway" || true
fi

echo -e "${GREEN}✓ Service stopped${NC}"

# ============================================================================
# Restore Database
# ============================================================================

if [ -n "$BACKUP_FILE" ]; then
    echo -e "\n${GREEN}[2/3] Restoring database...${NC}"

    BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

    if [ ! -f "$BACKUP_PATH" ]; then
        echo -e "${RED}Error: Backup file not found: $BACKUP_PATH${NC}"
        exit 1
    fi

    echo -e "${YELLOW}This will overwrite the current database!${NC}"
    read -p "Continue? (yes/no): " CONFIRM_DB

    if [ "$CONFIRM_DB" = "yes" ]; then
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "${DB_USER:-summit}" "${DB_NAME:-summit}" < "$BACKUP_PATH"
        echo -e "${GREEN}✓ Database restored${NC}"
    else
        echo "Database restore skipped"
    fi
else
    echo -e "\n${GREEN}[2/3] Skipping database restore${NC}"
fi

# ============================================================================
# Remove OPA Policies
# ============================================================================

echo -e "\n${GREEN}[3/3] Removing OPA policies...${NC}"

OPA_ENDPOINT="${OPA_ENDPOINT:-http://localhost:8181}"

curl -X DELETE "$OPA_ENDPOINT/v1/policies/agent" || echo -e "${YELLOW}Warning: Failed to remove OPA policy${NC}"

echo -e "${GREEN}✓ OPA policies removed${NC}"

# ============================================================================
# Rollback Complete
# ============================================================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Rollback Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "The Agent Gateway has been rolled back."
echo ""
echo "To re-deploy:"
echo "  ./scripts/deploy.sh"
echo ""
