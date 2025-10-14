#!/usr/bin/env bash
set -euo pipefail

REPORT_DIR=${REPORT_DIR:-security-reports}
mkdir -p "$REPORT_DIR"

failures=0
results=()

record_result() {
  local name="$1"
  local status="$2"
  local details="$3"
  results+=("${name}::${status}::${details}")
  if [[ "$status" != "pass" ]]; then
    failures=$((failures + 1))
  fi
}

check_file() {
  local path="$1"
  local description="$2"
  if [[ -f "$path" ]]; then
    record_result "$description" pass "${path} present"
  else
    record_result "$description" fail "${path} is required"
  fi
}

check_directory_non_empty() {
  local path="$1"
  local description="$2"
  if [[ -d "$path" ]]; then
    local entry
    entry=$(find "$path" -mindepth 1 -maxdepth 1 -print -quit)
    if [[ -n "$entry" ]]; then
      record_result "$description" pass "${path} contains policies"
      return
    fi
  fi
  record_result "$description" fail "${path} is missing or empty"
}

check_policy_rules() {
  local path="$1"
  local description="$2"
  if [[ -f "$path" ]] && [[ -s "$path" ]]; then
    record_result "$description" pass "${path} configured"
  else
    record_result "$description" fail "${path} missing baseline overrides"
  fi
}

check_yaml_key() {
  local file="$1"
  local key="$2"
  local description="$3"
  if [[ -f "$file" ]] && grep -qF "$key" "$file"; then
    record_result "$description" pass "${key} present in ${file}"
  else
    record_result "$description" fail "${key} not found in ${file}"
  fi
}

check_file "SECURITY.md" "Security policy published"
check_file ".github/dependabot.yml" "Dependabot configuration"
check_file "CODEOWNERS" "CODEOWNERS gate"
check_directory_non_empty "policies/opa" "OPA policy suite available"
check_file "docs/security/security-pipeline.md" "Security pipeline documentation"
check_policy_rules ".zap/rules.tsv" "ZAP baseline tuning rules"
check_yaml_key "infra/helm/intelgraph/values-prod.yaml" "image:" "Production Helm images pinned"

tmp_file=$(mktemp)
printf '%s\n' "${results[@]}" > "$tmp_file"
python - "$tmp_file" "$REPORT_DIR/baseline-report.json" <<'PY'
import json
import sys

input_path, output_path = sys.argv[1:3]
entries = []
with open(input_path, 'r', encoding='utf-8') as handle:
    for line in handle:
        line = line.strip()
        if not line:
            continue
        name, status, details = line.split('::', 2)
        entries.append({
            "name": name,
            "status": status,
            "details": details,
        })
with open(output_path, 'w', encoding='utf-8') as handle:
    json.dump(entries, handle, indent=2)
PY
rm -f "$tmp_file"

if (( failures > 0 )); then
  echo "Security baseline checks failed: ${failures}" >&2
  exit 1
fi

echo "Security baseline checks completed successfully."
