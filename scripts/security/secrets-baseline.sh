#!/usr/bin/env bash
set -euo pipefail

REPORT_DIR=${REPORT_DIR:-security-reports}
mkdir -p "$REPORT_DIR"

results=()
failures=0

record_result() {
  local name="$1"
  local status="$2"
  local details="$3"
  results+=("${name}::${status}::${details}")
  if [[ "$status" != "pass" ]]; then
    failures=$((failures + 1))
  fi
}

check_file_present() {
  local path="$1"
  local description="$2"
  if [[ -f "$path" ]] && [[ -s "$path" ]]; then
    record_result "$description" pass "${path} present"
  else
    record_result "$description" fail "${path} missing"
  fi
}

check_gitignore_for_env() {
  local path="$1"
  if [[ -f "$path" ]] && grep -q "^\.env" "$path"; then
    record_result "Environment files ignored" pass "${path} blocks .env"
  else
    record_result "Environment files ignored" fail "${path} missing .env rule"
  fi
}

check_file_present ".gitleaks.toml" "Gitleaks policy configured"
check_file_present ".github/workflows/gitleaks.yml" "Gitleaks workflow available"
check_file_present "docs/secrets-management.md" "Secrets management playbook published"
check_gitignore_for_env ".gitignore"

printf '%s\n' "${results[@]}" | python - "$REPORT_DIR/secrets-baseline.json" <<'PY'
import json
import sys

entries = sys.stdin.read().strip().splitlines()
report_path = sys.argv[1]

report = []
for entry in entries:
    name, status, details = entry.split('::', 2)
    report.append({"check": name, "status": status, "details": details})

data = {"status": "pass" if all(item["status"] == "pass" for item in report) else "fail", "checks": report}

with open(report_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(json.dumps(data, indent=2))
PY

if [[ $failures -gt 0 ]]; then
  exit 1
fi
