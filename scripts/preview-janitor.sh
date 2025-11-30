#!/bin/bash
set -e

# Preview Environment Janitor
# Deletes namespaces labeled 'type=preview' that are older than TTL_HOURS.
# Set DRY_RUN=false to actually delete.

DRY_RUN=${DRY_RUN:-true}
TTL_HOURS=${TTL_HOURS:-24}

echo "Starting Preview Janitor..."
echo "Config: TTL=${TTL_HOURS}h, DRY_RUN=${DRY_RUN}"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "Error: kubectl is required."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required."
  exit 1
fi

# Fetch namespaces with label type=preview
# We output name and creationTimestamp separated by tab
kubectl get ns -l type=preview -o json | jq -r '.items[] | .metadata.name + "\t" + .metadata.creationTimestamp' | while read -r name created; do
  if [ -z "$name" ]; then continue; fi

  # Parse timestamps (GNU date assumed for CI)
  created_ts=$(date -d "$created" +%s)
  current_ts=$(date +%s)
  age_sec=$((current_ts - created_ts))
  ttl_sec=$((TTL_HOURS * 3600))

  if [ "$age_sec" -gt "$ttl_sec" ]; then
    age_hours=$((age_sec / 3600))
    echo "EXPIRED: Namespace '$name' is ${age_hours}h old (Limit: ${TTL_HOURS}h)."

    if [ "$DRY_RUN" = "false" ]; then
      echo "Deleting namespace '$name'..."
      kubectl delete ns "$name"
    else
      echo "[DRY RUN] Would delete namespace '$name'."
    fi
  else
    age_hours=$((age_sec / 3600))
    echo "ACTIVE: Namespace '$name' is ${age_hours}h old."
  fi
done

echo "Janitor run complete."
