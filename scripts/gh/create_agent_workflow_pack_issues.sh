#!/usr/bin/env bash
set -euo pipefail

# Creates or updates the Summit agent workflow extension issues from docs/project_management/issues.
# Usage:
#   scripts/gh/create_agent_workflow_pack_issues.sh [owner/repo]
# Example:
#   scripts/gh/create_agent_workflow_pack_issues.sh BrianCLong/summit

REPO="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"

FILES=(
  "docs/project_management/issues/run_manifest_end_to_end_integration.md"
  "docs/project_management/issues/ci_reproducibility_gate.md"
  "docs/project_management/issues/compliance_automation_sbom_policy_hashing.md"
  "docs/project_management/issues/cost_telemetry_budget_enforcement.md"
  "docs/project_management/issues/explain_cli_enhancements.md"
  "docs/project_management/issues/repo_consistency_technical_debt_sweep.md"
)

declare -A LABEL_COLORS=(
  [codex]="0e8a16"
  [ga-blocker]="000000"
  [determinism]="0052cc"
  [infra]="1f77b4"
  [ci]="5319e7"
  [compliance]="8b5cf6"
  [security]="6610f2"
  [cost-control]="f59e0b"
  [observability]="0ea5e9"
  [ga]="4c1d95"
  [ux]="ec4899"
  [explainability]="14b8a6"
  [tech-debt]="6b7280"
  [refactor]="a3e635"
  [maintenance]="94a3b8"
)

declare -A LABEL_DESCRIPTIONS=(
  [codex]="Codex-owned implementation work"
  [ga-blocker]="GA ship blocker"
  [determinism]="Deterministic execution and reproducibility"
  [infra]="Infrastructure and runtime foundations"
  [ci]="Continuous integration workflow changes"
  [compliance]="Compliance and control evidence"
  [security]="Security-related tasks"
  [cost-control]="Cost telemetry and budget enforcement"
  [observability]="Metrics, traces, and operational visibility"
  [ga]="General availability readiness work"
  [ux]="User experience and usability"
  [explainability]="Decision transparency and explainability"
  [tech-debt]="Technical debt reduction"
  [refactor]="Refactoring with no intended behavior change"
  [maintenance]="Maintenance and upkeep"
)

ensure_label() {
  local name="$1"
  gh label create "$name" \
    --repo "$REPO" \
    --force \
    --color "${LABEL_COLORS[$name]}" \
    --description "${LABEL_DESCRIPTIONS[$name]}" >/dev/null
}

extract_title() {
  sed -n '1s/^# //p' "$1"
}

extract_labels() {
  sed -n 's/^\*\*Labels:\*\* //p' "$1" \
    | sed 's/`//g' \
    | tr ',' '\n' \
    | sed 's/^ *//;s/ *$//' \
    | sed '/^$/d'
}

issue_number_by_title() {
  local title="$1"
  gh issue list --repo "$REPO" --state all --search "$title in:title" --json number,title \
    | jq -r --arg t "$title" '.[] | select(.title == $t) | .number' | head -n 1
}

for file in "${FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing file: $file" >&2
    exit 1
  fi
done

echo "Using repository: $REPO"

for file in "${FILES[@]}"; do
  title="$(extract_title "$file")"
  mapfile -t labels < <(extract_labels "$file")

  if [[ -z "$title" ]]; then
    echo "Unable to extract title from $file" >&2
    exit 1
  fi

  for label in "${labels[@]}"; do
    if [[ -n "${LABEL_COLORS[$label]:-}" ]]; then
      ensure_label "$label"
    fi
  done

  existing_number="$(issue_number_by_title "$title" || true)"
  if [[ -n "$existing_number" ]]; then
    echo "Updating #$existing_number: $title"
    gh issue edit "$existing_number" --repo "$REPO" --title "$title" --body-file "$file" >/dev/null
    for label in "${labels[@]}"; do
      gh issue edit "$existing_number" --repo "$REPO" --add-label "$label" >/dev/null || true
    done
  else
    echo "Creating: $title"
    args=(--repo "$REPO" --title "$title" --body-file "$file")
    for label in "${labels[@]}"; do
      args+=(--label "$label")
    done
    gh issue create "${args[@]}" >/dev/null
  fi
done

echo "Issue pack sync complete."
