#!/bin/bash
# Generated cleanup commands - REVIEW BEFORE EXECUTING

set -euo pipefail

# PRIORITY 1: Close ancient branches (catastrophic merge risk)
echo "Closing ancient branch: claude/batch-issue-processor-Yo2zn"
gh pr close $(gh pr list --head "claude/batch-issue-processor-Yo2zn" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: claude/master-orchestrator-prompt-WHxWp"
gh pr close $(gh pr list --head "claude/master-orchestrator-prompt-WHxWp" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: claude/provenance-explorer-ui-OVdQX"
gh pr close $(gh pr list --head "claude/provenance-explorer-ui-OVdQX" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/confirm-service-#2-code-location-and-update-docs"
gh pr close $(gh pr list --head "codex/confirm-service-#2-code-location-and-update-docs" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/create-table/list-ux-improvements-queue"
gh pr close $(gh pr list --head "codex/create-table/list-ux-improvements-queue" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/create-table/list-ux-improvements-queue-y02fb5"
gh pr close $(gh pr list --head "codex/create-table/list-ux-improvements-queue-y02fb5" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/define-integration-methods-for-graphika,-recorded-future-and"
gh pr close $(gh pr list --head "codex/define-integration-methods-for-graphika,-recorded-future-and" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/define-mvp-ui/ux-structure-and-workflows"
gh pr close $(gh pr list --head "codex/define-mvp-ui/ux-structure-and-workflows" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/define-request/response-schema-and-auth-hooks"
gh pr close $(gh pr list --head "codex/define-request/response-schema-and-auth-hooks" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/execute-ux-sweep-for-project-#19"
gh pr close $(gh pr list --head "codex/execute-ux-sweep-for-project-#19" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/execute-ux-sweep-for-project-#19-0x926p"
gh pr close $(gh pr list --head "codex/execute-ux-sweep-for-project-#19-0x926p" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/implement-opa/abac-policy-enforcement"
gh pr close $(gh pr list --head "codex/implement-opa/abac-policy-enforcement" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/make-pr-#15382-merge-ready-with-validation"
gh pr close $(gh pr list --head "codex/make-pr-#15382-merge-ready-with-validation" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/make-pr-#15382-merge-ready-with-validation-jutlng"
gh pr close $(gh pr list --head "codex/make-pr-#15382-merge-ready-with-validation-jutlng" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/prepare-pr-#15381-for-merge"
gh pr close $(gh pr list --head "codex/prepare-pr-#15381-for-merge" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/prepare-pr-#15381-for-merge-f1v5b9"
gh pr close $(gh pr list --head "codex/prepare-pr-#15381-for-merge-f1v5b9" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/standardize-ci/test-infrastructure"
gh pr close $(gh pr list --head "codex/standardize-ci/test-infrastructure" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/standardize-ci/test-infrastructure-aai9vn"
gh pr close $(gh pr list --head "codex/standardize-ci/test-infrastructure-aai9vn" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/systematically-close-project-#19-backlog-items"
gh pr close $(gh pr list --head "codex/systematically-close-project-#19-backlog-items" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/systematically-close-project-#19-backlog-items-7xg2q9"
gh pr close $(gh pr list --head "codex/systematically-close-project-#19-backlog-items-7xg2q9" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/update-roadmap-and-documentation-for-service-#3"
gh pr close $(gh pr list --head "codex/update-roadmap-and-documentation-for-service-#3" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/update-status.json-and-documentation"
gh pr close $(gh pr list --head "codex/update-status.json-and-documentation" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/update-status.json-for-current-sprint"
gh pr close $(gh pr list --head "codex/update-status.json-for-current-sprint" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: codex/update-status.json-for-current-sprint-yt2jgw"
gh pr close $(gh pr list --head "codex/update-status.json-for-current-sprint-yt2jgw" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: feature/enhanced-storage-backup-dr-1234585080480741505"
gh pr close $(gh pr list --head "feature/enhanced-storage-backup-dr-1234585080480741505" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

echo "Closing ancient branch: infra-enhance-redis-dr-2274442055878795105"
gh pr close $(gh pr list --head "infra-enhance-redis-dr-2274442055878795105" --json number -q ".[0].number") \
  --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead). Please open fresh PR if needed." \
  --delete-branch || true

# Close already-merged branches
echo "Closing merged branch: claude/expose-sprint-issues-PusNU"
gh pr close $(gh pr list --head "claude/expose-sprint-issues-PusNU" --json number -q ".[0].number") \
  --comment "Closing: Changes already merged into main" \
  --delete-branch || true

echo "Closing merged branch: claude/fix-pr-16364-readme-6F94K-15790"
gh pr close $(gh pr list --head "claude/fix-pr-16364-readme-6F94K-15790" --json number -q ".[0].number") \
  --comment "Closing: Changes already merged into main" \
  --delete-branch || true

echo "Closing merged branch: release/evidence-id-consistency-v1.3.0"
gh pr close $(gh pr list --head "release/evidence-id-consistency-v1.3.0" --json number -q ".[0].number") \
  --comment "Closing: Changes already merged into main" \
  --delete-branch || true

# Close stale auto-remediation branches
echo "Closing stale auto-remediation: auto-remediation/state-update-20260120-163504"
gh pr close $(gh pr list --head "auto-remediation/state-update-20260120-163504" --json number -q ".[0].number") \
  --comment "Superseded by newer state updates" \
  --delete-branch || true

echo "Closing stale auto-remediation: auto-remediation/state-update-20260120-204203"
gh pr close $(gh pr list --head "auto-remediation/state-update-20260120-204203" --json number -q ".[0].number") \
  --comment "Superseded by newer state updates" \
  --delete-branch || true

echo "Closing stale auto-remediation: auto-remediation/state-update-20260121-014500"
gh pr close $(gh pr list --head "auto-remediation/state-update-20260121-014500" --json number -q ".[0].number") \
  --comment "Superseded by newer state updates" \
  --delete-branch || true

echo "Closing stale auto-remediation: auto-remediation/state-update-20260121-044253"
gh pr close $(gh pr list --head "auto-remediation/state-update-20260121-044253" --json number -q ".[0].number") \
  --comment "Superseded by newer state updates" \
  --delete-branch || true

echo "Closing stale auto-remediation: auto-remediation/state-update-20260121-083056"
gh pr close $(gh pr list --head "auto-remediation/state-update-20260121-083056" --json number -q ".[0].number") \
  --comment "Superseded by newer state updates" \
  --delete-branch || true

echo "Closing stale auto-remediation: auto-remediation/state-update-20260121-124838"
gh pr close $(gh pr list --head "auto-remediation/state-update-20260121-124838" --json number -q ".[0].number") \
  --comment "Superseded by newer state updates" \
  --delete-branch || true

echo "Closing stale auto-remediation: auto-remediation/state-update-20260121-164328"
gh pr close $(gh pr list --head "auto-remediation/state-update-20260121-164328" --json number -q ".[0].number") \
  --comment "Superseded by newer state updates" \
  --delete-branch || true

echo "Closing stale auto-remediation: auto-remediation/state-update-20260121-202939"
gh pr close $(gh pr list --head "auto-remediation/state-update-20260121-202939" --json number -q ".[0].number") \
  --comment "Superseded by newer state updates" \
  --delete-branch || true

