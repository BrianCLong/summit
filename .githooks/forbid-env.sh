#!/usr/bin/env bash
set -euo pipefail

# Block committing any files that look like secrets or envs.
PROHIBITED_REGEX='(^|/)(\.env(\..*)?$|.*secrets?.*|id_rsa|id_dsa|\.pem|\.p12|\.pfx)$'

EXIT=0
while read -r file; do
  if [[ "$file" =~ $PROHIBITED_REGEX ]]; then
    echo "❌ Blocked: attempting to commit prohibited file: $file" >&2
    EXIT=1
  fi
done < <(git diff --cached --name-only)

if [[ $EXIT -ne 0 ]]; then
  cat <<'MSG' >&2

Committing .env / secret-like files is disallowed.
→ Use .env.example and a secrets manager (AWS Secrets Manager / SSM / Vault).
→ If you must override, rename to a non-prohibited pattern and ensure it's in .gitignore.

MSG
  exit $EXIT
fi