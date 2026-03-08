#!/bin/bash
# Setup automated CI monitoring via cron
# Runs runner-saturation-policy.sh every 5 minutes to monitor queue health
# and automatically recover from saturation conditions

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT_PATH="$REPO_ROOT/scripts/ci/runner-saturation-policy.sh"
LOG_DIR="$HOME/.summit-ci-monitoring"
LOG_FILE="$LOG_DIR/saturation-policy.log"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== CI Automated Monitoring Setup ===${NC}\n"

# Create log directory
if [ ! -d "$LOG_DIR" ]; then
  echo -e "${GREEN}Creating log directory: $LOG_DIR${NC}"
  mkdir -p "$LOG_DIR"
fi

# Verify script exists
if [ ! -f "$SCRIPT_PATH" ]; then
  echo -e "${YELLOW}Error: $SCRIPT_PATH not found${NC}"
  exit 1
fi

# Make script executable
chmod +x "$SCRIPT_PATH"

# Create cron job entry
CRON_JOB="*/5 * * * * cd $REPO_ROOT && bash $SCRIPT_PATH >> $LOG_FILE 2>&1"

# Check if cron job already exists
CRON_EXISTS=false
if crontab -l 2>/dev/null | grep -q "runner-saturation-policy.sh"; then
  CRON_EXISTS=true
  echo -e "${GREEN}✅ Cron job already configured${NC}"
else
  echo -e "${YELLOW}⚠️  Cron job not yet configured${NC}"
fi

echo -e "\n${BLUE}=== Cron Job Configuration ===${NC}\n"
echo -e "To enable automated monitoring, add this line to your crontab:"
echo -e "${GREEN}$CRON_JOB${NC}\n"

if [ "$CRON_EXISTS" = false ]; then
  echo -e "Run this command to add it:"
  echo -e "${GREEN}(crontab -l 2>/dev/null; echo '$CRON_JOB') | crontab -${NC}\n"

  echo -e "Or manually edit crontab:"
  echo -e "${GREEN}crontab -e${NC}\n"
fi

echo -e "${GREEN}✅ Setup script complete!${NC}\n"

echo -e "${BLUE}Configuration:${NC}"
echo -e "  Script:     $SCRIPT_PATH"
echo -e "  Log file:   $LOG_FILE"
echo -e "  Frequency:  Every 5 minutes"
echo -e "  Cron entry: $CRON_JOB"

echo -e "\n${BLUE}Monitoring Thresholds:${NC}"
echo -e "  HEALTHY   (<100):   No action"
echo -e "  ELEVATED  (100-199): Monitor only"
echo -e "  CRITICAL  (200-299): Auto-enable MERGE_SURGE + cancel archived"
echo -e "  GRIDLOCK  (300+):    Emergency cancel ALL + alert"

echo -e "\n${BLUE}Useful Commands:${NC}"
echo -e "  View logs:      tail -f $LOG_FILE"
echo -e "  Check status:   bash $SCRIPT_PATH"
echo -e "  List cron jobs: crontab -l"
echo -e "  Remove cron:    crontab -l | grep -v runner-saturation-policy | crontab -"

echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "  1. Monitor first few runs: tail -f $LOG_FILE"
echo -e "  2. Verify auto-recovery works if queue grows"
echo -e "  3. Check docs/ci/recovery-status-update.md for status"

echo -e "\n${GREEN}Automated monitoring is now active! 🚀${NC}\n"
