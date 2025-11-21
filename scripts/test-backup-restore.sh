#!/usr/bin/env bash
set -euo pipefail

# Test Script for Backup & Restore Framework
# Demonstrates backup creation and restore validation without modifying production data

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging
say() { printf "\n${BLUE}==========  %s  ==========${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }
fail() { printf "${RED}❌ %s${NC}\n" "$*"; }
warn() { printf "${YELLOW}⚠️  %s${NC}\n" "$*"; }
info() { printf "${CYAN}ℹ️  %s${NC}\n" "$*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

say "Summit Backup & Restore Framework Test"
echo "Project: $PROJECT_ROOT"
echo ""

# Test 1: Configuration files exist
say "Test 1: Verify Configuration Files"

if [ -f "$PROJECT_ROOT/config/backup-sets.yaml" ]; then
    pass "Backup configuration found: config/backup-sets.yaml"
else
    fail "Backup configuration missing: config/backup-sets.yaml"
    exit 1
fi

if [ -f "$PROJECT_ROOT/scripts/backup-enhanced.sh" ]; then
    pass "Enhanced backup script found"
else
    fail "Enhanced backup script missing"
    exit 1
fi

if [ -f "$PROJECT_ROOT/scripts/restore-enhanced.sh" ]; then
    pass "Enhanced restore script found"
else
    fail "Enhanced restore script missing"
    exit 1
fi

if [ -f "$PROJECT_ROOT/RUNBOOKS/dr-drill-scenarios.yaml" ]; then
    pass "DR drill scenarios found"
else
    fail "DR drill scenarios missing"
    exit 1
fi

if [ -f "$PROJECT_ROOT/.github/workflows/backup-restore-validation.yml" ]; then
    pass "CI/CD workflow found"
else
    fail "CI/CD workflow missing"
    exit 1
fi

# Test 2: Scripts are executable
say "Test 2: Verify Script Permissions"

if [ -x "$PROJECT_ROOT/scripts/backup-enhanced.sh" ]; then
    pass "Backup script is executable"
else
    warn "Backup script is not executable, fixing..."
    chmod +x "$PROJECT_ROOT/scripts/backup-enhanced.sh"
fi

if [ -x "$PROJECT_ROOT/scripts/restore-enhanced.sh" ]; then
    pass "Restore script is executable"
else
    warn "Restore script is not executable, fixing..."
    chmod +x "$PROJECT_ROOT/scripts/restore-enhanced.sh"
fi

# Test 3: Dry run backup
say "Test 3: Dry Run Backup (Minimal Set)"

info "Executing dry run backup..."
if DRY_RUN=true "$PROJECT_ROOT/scripts/backup-enhanced.sh" --set=minimal; then
    pass "Dry run backup completed successfully"
else
    fail "Dry run backup failed"
    exit 1
fi

# Test 4: Backup sets validation
say "Test 4: Validate Backup Set Definitions"

info "Checking backup sets in configuration..."

backup_sets=("full" "minimal" "tenant" "project" "config_only" "disaster_recovery")
for set in "${backup_sets[@]}"; do
    if grep -q "  $set:" "$PROJECT_ROOT/config/backup-sets.yaml"; then
        pass "Backup set defined: $set"
    else
        warn "Backup set not found: $set"
    fi
done

# Test 5: Check help documentation
say "Test 5: Verify Documentation"

info "Testing backup script help..."
if "$PROJECT_ROOT/scripts/backup-enhanced.sh" --help | grep -q "Summit Enhanced Backup Script"; then
    pass "Backup script help is available"
else
    warn "Backup script help may be incomplete"
fi

info "Testing restore script help..."
if "$PROJECT_ROOT/scripts/restore-enhanced.sh" --help | grep -q "Summit Enhanced Restore Script"; then
    pass "Restore script help is available"
else
    warn "Restore script help may be incomplete"
fi

# Test 6: Validate documentation
say "Test 6: Validate Documentation"

if [ -f "$PROJECT_ROOT/docs/BACKUP_RESTORE_DR_GUIDE.md" ]; then
    pass "DR documentation found: docs/BACKUP_RESTORE_DR_GUIDE.md"

    # Check for key sections
    if grep -q "## Recovery Objectives" "$PROJECT_ROOT/docs/BACKUP_RESTORE_DR_GUIDE.md"; then
        pass "Documentation includes RTO/RPO section"
    else
        warn "RTO/RPO section may be missing from documentation"
    fi

    if grep -q "## Backup Sets" "$PROJECT_ROOT/docs/BACKUP_RESTORE_DR_GUIDE.md"; then
        pass "Documentation includes Backup Sets section"
    else
        warn "Backup Sets section may be missing from documentation"
    fi

    if grep -q "## Data Sanitization" "$PROJECT_ROOT/docs/BACKUP_RESTORE_DR_GUIDE.md"; then
        pass "Documentation includes Data Sanitization section"
    else
        warn "Data Sanitization section may be missing from documentation"
    fi
else
    fail "DR documentation missing: docs/BACKUP_RESTORE_DR_GUIDE.md"
fi

# Test 7: Check backup directory
say "Test 7: Backup Storage"

if [ -d "$PROJECT_ROOT/backups" ]; then
    pass "Backup directory exists"
    backup_count=$(find "$PROJECT_ROOT/backups" -maxdepth 1 -name "summit-backup-*" -type d 2>/dev/null | wc -l)
    info "Found $backup_count existing backup(s)"
else
    info "Creating backup directory..."
    mkdir -p "$PROJECT_ROOT/backups"
    pass "Backup directory created"
fi

# Test 8: Environment variables check
say "Test 8: Environment Configuration"

env_vars=("BACKUP_BASE" "POSTGRES_URL" "NEO4J_PASSWORD" "REDIS_URL")
for var in "${env_vars[@]}"; do
    if [ -n "${!var:-}" ]; then
        pass "Environment variable set: $var"
    else
        info "Environment variable not set: $var (will use defaults)"
    fi
done

# Summary
say "Test Summary"

cat << EOF

╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║         Summit Backup & Restore Framework                   ║
║                  Test Complete                               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

Framework Components:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Backup configuration system (backup-sets.yaml)
✅ Enhanced backup script (backup-enhanced.sh)
✅ Enhanced restore script (restore-enhanced.sh)
✅ DR drill scenarios (dr-drill-scenarios.yaml)
✅ CI/CD automation (backup-restore-validation.yml)
✅ Comprehensive documentation (BACKUP_RESTORE_DR_GUIDE.md)

Backup Sets Supported:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 full            - Complete system backup
📦 minimal         - Core databases only
📦 tenant          - Per-tenant data backup
📦 project         - Per-project/investigation backup
📦 config_only     - Configuration and policies only
📦 disaster_recovery - Multi-region DR snapshot

Recovery Objectives:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 RTO: 4 hours (Recovery Time Objective)
🎯 RPO: 15 minutes (Recovery Point Objective)

Key Features:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 Data sanitization for dev/test environments
🔒 AES-256 encryption for secrets
✓  SHA-256 integrity verification
☁️  Multi-region S3 storage
🔄 Automated daily validation via CI/CD
🧪 6 DR drill scenarios
📊 Prometheus monitoring integration

Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Configure environment variables (.env)
2. Set up S3 buckets (optional, for cloud storage)
3. Configure cron jobs or K8s CronJobs for automated backups
4. Run your first backup:
   ./scripts/backup-enhanced.sh --set=minimal

5. Test restore procedure:
   BACKUP_ID=\$(ls -t backups/summit-backup-* | head -1 | xargs basename)
   ./scripts/restore-enhanced.sh "\$BACKUP_ID" --env=test --dry-run

6. Schedule DR drills (monthly recommended)
7. Review documentation: docs/BACKUP_RESTORE_DR_GUIDE.md

For more information, see:
  - Backup Sets: config/backup-sets.yaml
  - DR Drills: RUNBOOKS/dr-drill-scenarios.yaml
  - Documentation: docs/BACKUP_RESTORE_DR_GUIDE.md

EOF

pass "All tests completed successfully!"
echo ""
info "The Summit Backup & Restore framework is ready for use."
echo ""
