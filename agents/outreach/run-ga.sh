#!/usr/bin/env bash
set -euo pipefail

# Summit Outreach Automation
# Purpose: Generate personalized outreach emails for GA launch.

echo "📧 Starting Outreach Generation..."
python3 agents/outreach/generate_outreach.py

echo "✅ Outreach batch generated in agents/outreach/output/outreach_batch_v1.json"
