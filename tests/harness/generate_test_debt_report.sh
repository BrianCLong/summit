#!/bin/bash
# Script to generate a test debt report.

echo "# Test Debt Report" > test_debt_report.md
echo "## Slow Tests" >> test_debt_report.md
# We will mock this or try to find a real report for slow tests
echo "- mock-slow-test-1: 1.5s" >> test_debt_report.md

echo "## Unowned Tests" >> test_debt_report.md
echo "- tests/governance/governance.test.ts" >> test_debt_report.md

echo "## Flaky Tests" >> test_debt_report.md
echo "- server/src/tests/semanticSearch.test.ts" >> test_debt_report.md

cat test_debt_report.md
