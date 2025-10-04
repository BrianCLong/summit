#!/usr/bin/env bash
set -euo pipefail
CSV="$1"; KIND="$2"
IFS=','
# requires: gh >= 2.63 with projects & graphql
while read -r LINE; do
  if [[ "$LINE" == uid,* ]]; then continue; fi
  UID=$(echo "$LINE" | cut -d',' -f1)
  TITLE=$(echo "$LINE" | cut -d',' -f3)
  BODY=$(echo "$LINE")
  LABELS="ops,$(echo "$KIND" | tr '[:upper:]' '[:lower:]')"
  # Upsert by searching issue with UID label
  NUM=$(gh issue list --search "$UID in:body" --limit 1 --json number -q '.[0].number' || true)
  if [[ -z "$NUM" || "$NUM" == "null" ]]; then
    NUM=$(gh issue create -t "$TITLE" -b "UID: $UID\n\n$BODY" -l "$LABELS" --json number -q .number)
  else
    gh issue edit "$NUM" -t "$TITLE" -b "UID: $UID\n\n$BODY" -l "$LABELS"
  fi
  # Optional: add to a default project if column present
  PROJ=$(echo "$LINE" | grep -oE ',[^,]*$' | tr -d ',') || true
  if [[ -n "$PROJ" ]]; then
    gh project item-add --project "$PROJ" --url "$(gh issue view $NUM --json url -q .url)" || true
  fi
  echo "$KIND $UID -> issue #$NUM"
done < <(tail -n +2 "$CSV")
