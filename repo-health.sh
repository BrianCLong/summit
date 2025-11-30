#!/bin/bash
echo "=== Summit Repository Health Check ==="
echo ""
echo "📊 Open PRs: $(gh pr list --state open | wc -l)"
echo "📋 Open Issues: $(gh issue list --state open | wc -l)"
echo "🔴 Failed CI Runs: $(gh run list --status failure --limit 10 | wc -l)"
echo "✅ Recent Successful Deploys: $(gh run list --workflow=release --status success --limit 5 | wc -l)"
echo ""
echo "🎯 Top Priority Issues:"
gh issue list --label "priority:P1" --limit 5
echo ""
echo "⏰ PRs Ready for Review:"
gh pr list --label "needs-review" --limit 5
