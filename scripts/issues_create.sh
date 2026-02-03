# scripts/issues_create.sh
set -euo pipefail
REPO=${1:?"usage: $0 owner/repo"}
FILE=${2:?"usage: $0 owner/repo issues.jsonl"}
while IFS= read -r line; do
  title=$(echo "$line" | jq -r .title)
  body=$(echo  "$line" | jq -r .body)
  labels=$(echo "$line" | jq -r '.labels | join(",")')
  milestone=$(echo "$line" | jq -r '.milestone // empty')
  if [[ -n "$milestone" ]]; then
    gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels" --milestone "$milestone"
  else
    gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels"
  fi
  echo "Created: $title"
  sleep 0.2
done < "$FILE"
