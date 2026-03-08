#!/bin/bash
# Script to generate weekly upgrade delta report
echo "# Weekly Upgrade Delta Report" > upgrade_report_$(date +%Y-%m-%d).md
echo "## What Changed" >> upgrade_report_$(date +%Y-%m-%d).md
echo "- Upgraded Node.js to v22 across all CI workflows, Dockerfiles, and package configurations." >> upgrade_report_$(date +%Y-%m-%d).md
echo "- Pinned OPA openpolicyagent/opa image to specific version 0.61.0, replacing 'latest' tags for better reproducibility and security." >> upgrade_report_$(date +%Y-%m-%d).md
echo "" >> upgrade_report_$(date +%Y-%m-%d).md
echo "## Why" >> upgrade_report_$(date +%Y-%m-%d).md
echo "- Moving to Node 22 leverages LTS features, performance improvements, and ensures long-term support." >> upgrade_report_$(date +%Y-%m-%d).md
echo "- Pinning container image tags mitigates the risk of unexpected runtime breaks and supply chain attacks caused by unvetted 'latest' images." >> upgrade_report_$(date +%Y-%m-%d).md
echo "" >> upgrade_report_$(date +%Y-%m-%d).md
echo "## Risk Assessment" >> upgrade_report_$(date +%Y-%m-%d).md
echo "- **Risk:** Low. Changes are restricted to build environments and runtime versions; backwards compatibility in Node and OPA minor versions expected." >> upgrade_report_$(date +%Y-%m-%d).md
echo "- **Rollback Plan:** Revert Node.js version updates to 20 and OPA tags to their previous state in case of CI/CD pipeline failures or production issues." >> upgrade_report_$(date +%Y-%m-%d).md
