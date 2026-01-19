#!/usr/bin/env bash
set -euo pipefail

echo "[gate] Secret scanning"

# Exclude list for files/dirs
# We exclude this script itself from the check
EXCLUDES="--exclude-dir=.git --exclude=gitleaks.json --exclude=*.md --exclude=.claude/mcp.json --exclude-dir=node_modules --exclude-dir=.archive --exclude-dir=tests --exclude-dir=test --exclude-dir=fixtures --exclude-dir=__tests__ --exclude=*.test.ts --exclude=*.spec.ts --exclude=*.kt --exclude=*.yaml --exclude=*.yml --exclude=secret_scan_gate.sh"

# We grep for potential secrets, then filter out common safe patterns (env vars, secrets context, mocks, variable declarations)
# If grep finds something after filtering, we fail.

if grep -RIn $EXCLUDES -E "(AWS_SECRET_ACCESS_KEY|BEGIN PRIVATE KEY)" . | \
   grep -v "process.env" | \
   grep -v "\${{ secrets" | \
   grep -v "\${env" | \
   grep -v "\${AWS" | \
   grep -v "\$AWS" | \
   grep -v "<ssm:" | \
   grep -v "MOCK" | \
   grep -v "mock" | \
   grep -v "Mock" | \
   grep -v "example" | \
   grep -v "Example" | \
   grep -v "TODO" | \
   grep -v "dummy" | \
   grep -v "your_secret" | \
   grep -v ": ''" | \
   grep -v "variable \"" | \
   grep -v "Regex" | \
   grep -v "regex" | \
   grep -v "const staticAwsKeyRegex" | \
   grep -v "/(?:AWS_ACCESS_KEY_ID" | \
   grep -v "aws_secret=abcd" | \
   grep -v "grep -RIn" | \
   grep -v "AWS_SECRET_ACCESS_KEY=\"\\\\\$" | \
   grep -v "AWS_SECRET_ACCESS_KEY=\"\\\\\$new_secret\""; then

  echo "❌ Secret material detected (potentially):"
  # Re-run to display (same pipeline)
  grep -RIn $EXCLUDES -E "(AWS_SECRET_ACCESS_KEY|BEGIN PRIVATE KEY)" . | \
   grep -v "process.env" | \
   grep -v "\${{ secrets" | \
   grep -v "\${env" | \
   grep -v "\${AWS" | \
   grep -v "\$AWS" | \
   grep -v "<ssm:" | \
   grep -v "MOCK" | \
   grep -v "mock" | \
   grep -v "Mock" | \
   grep -v "example" | \
   grep -v "Example" | \
   grep -v "TODO" | \
   grep -v "dummy" | \
   grep -v "your_secret" | \
   grep -v ": ''" | \
   grep -v "variable \"" | \
   grep -v "Regex" | \
   grep -v "regex" | \
   grep -v "const staticAwsKeyRegex" | \
   grep -v "/(?:AWS_ACCESS_KEY_ID" | \
   grep -v "aws_secret=abcd" | \
   grep -v "grep -RIn" | \
   grep -v "AWS_SECRET_ACCESS_KEY=\"\\\\\$" | \
   grep -v "AWS_SECRET_ACCESS_KEY=\"\\\\\$new_secret\""
  exit 1
fi
echo "✅ Secret scan passed"
