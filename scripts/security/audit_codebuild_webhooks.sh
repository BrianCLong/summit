#!/bin/bash
# AWS CodeBuild Webhook Security Audit
# Checks for unanchored regex patterns in CodeBuild webhook filters ("CodeBreach" vulnerability).

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 AWS CodeBuild Webhook Security Audit${NC}"
echo -e "${BLUE}Checking for unanchored regex patterns in webhook filters...${NC}"

# Check prerequisites
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed.${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed.${NC}"
    exit 1
fi

# Get all CodeBuild projects
PROJECTS=$(aws codebuild list-projects --output text --query 'projects[*]')

if [ -z "$PROJECTS" ]; then
    echo -e "${GREEN}No CodeBuild projects found in this region.${NC}"
    exit 0
fi

echo -e "Found projects: $PROJECTS"

# Iterate through projects
for PROJECT in $PROJECTS; do
    echo -e "\nScanning project: ${YELLOW}$PROJECT${NC}..."

    # Get webhook details
    WEBHOOK=$(aws codebuild batch-get-projects --names "$PROJECT" --query 'projects[0].webhook' --output json)

    # Check if webhook is enabled
    IS_ENABLED=$(echo "$WEBHOOK" | jq -r '.url != "" and .url != null')

    if [ "$IS_ENABLED" != "true" ]; then
        echo "  - Webhook not configured or disabled. [SKIP]"
        continue
    fi

    # Get filter groups
    FILTER_GROUPS=$(echo "$WEBHOOK" | jq -c '.filterGroups[]')

    if [ -z "$FILTER_GROUPS" ]; then
        echo -e "  - ${YELLOW}Webhook enabled but no filters configured. All events trigger builds!${NC}"
        continue
    fi

    echo "$FILTER_GROUPS" | while read -r GROUP; do
        # Check each filter in the group
        echo "$GROUP" | jq -c '.[]' | while read -r FILTER; do
            TYPE=$(echo "$FILTER" | jq -r '.type')
            PATTERN=$(echo "$FILTER" | jq -r '.pattern')

            # Check for actor account ID or head ref filters
            if [[ "$TYPE" == "ACTOR_ACCOUNT_ID" ]] || [[ "$TYPE" == "HEAD_REF" ]]; then
                # Check if pattern is anchored
                if [[ "$PATTERN" != ^* ]] || [[ "$PATTERN" != *\$ ]]; then
                     echo -e "  - ${RED}VULNERABLE: Unanchored regex found!${NC}"
                     echo -e "    Type: $TYPE"
                     echo -e "    Pattern: '$PATTERN'"
                     echo -e "    Remediation: Change pattern to '^$PATTERN$'"
                else
                     echo -e "  - ${GREEN}OK: Anchored regex found ($TYPE: $PATTERN)${NC}"
                fi
            fi
        done
    done
done

echo -e "\n${BLUE}Audit complete.${NC}"
