#!/bin/bash
set -e

REPORT_FILE="docs/project/REPO_SCAFFOLDING_REPORT.md"

echo "# Repository Scaffolding Verification Report" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Date**: $(date)" >> "$REPORT_FILE"
echo "**User**: $(whoami)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "## Directory Structure Check" >> "$REPORT_FILE"
echo "| Path | Status | Details |" >> "$REPORT_FILE"
echo "|------|--------|---------|" >> "$REPORT_FILE"

check_path() {
    path=$1
    if [ -e "$path" ]; then
        if [ -d "$path" ]; then
            details="Directory exists"
        else
            details="File exists"
        fi
        echo "| \`$path\` | ✅ Found | $details |" >> "$REPORT_FILE"
    else
        echo "| \`$path\` | ❌ Missing | Required path not found |" >> "$REPORT_FILE"
    fi
}

check_path "packages/"
check_path "client/"
check_path "server/"
check_path "docs/"
check_path "package.json"
check_path "pnpm-workspace.yaml"
check_path ".github/workflows"
check_path "docker-compose.yml"
check_path "AGENTS.md"
check_path "project_management/INTELGRAPH_MASTER_BACKLOG.md"

echo "" >> "$REPORT_FILE"
echo "## Key File Content Checks" >> "$REPORT_FILE"

if grep -q "workspaces" package.json; then
    echo "- ✅ \`package.json\` contains workspaces configuration." >> "$REPORT_FILE"
else
    echo "- ❌ \`package.json\` missing workspaces configuration." >> "$REPORT_FILE"
fi

if [ -f "pnpm-workspace.yaml" ]; then
    echo "- ✅ \`pnpm-workspace.yaml\` exists." >> "$REPORT_FILE"
else
    echo "- ❌ \`pnpm-workspace.yaml\` missing." >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "## Summary" >> "$REPORT_FILE"
echo "Scaffolding verification complete." >> "$REPORT_FILE"

cat "$REPORT_FILE"
