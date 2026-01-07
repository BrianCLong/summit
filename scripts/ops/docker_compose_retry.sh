#!/bin/bash
# Wrapper for docker compose with retry logic for flaky registries
set -e

# Default retries
RETRIES=${RETRIES:-5}
DELAY=${DELAY:-5}

# Extract arguments. We assume "$@" is passed to this script to be forwarded to docker compose
# We need to run the command in a loop.

# Construct the command
CMD=(docker compose "$@")

for ((i=1; i<=RETRIES; i++)); do
    # Only print the command without executing to show what we are doing
    echo "Attempt $i/$RETRIES: ${CMD[*]}"
    if "${CMD[@]}"; then
        exit 0
    fi
    echo "Attempt $i failed. Waiting ${DELAY}s..."
    sleep $DELAY
    # Increase delay for exponential backoff
    DELAY=$((DELAY * 2))
done

echo "Command failed after $RETRIES attempts."
exit 1
