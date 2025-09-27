#!/bin/bash
# Replays messages from a Dead-Letter Queue (DLQ) back to the original topic.

set -euo pipefail

SRC_TOPIC=${1:?"Usage: $0 <source_dlq_topic> [destination_topic]"}
DST_TOPIC=${2:-${SRC_TOPIC%.dlq}} # Default to source topic without .dlq suffix

if [ -z "${KAFKA_BROKERS:-}" ]; then
  echo "Error: KAFKA_BROKERS environment variable must be set." >&2
  exit 1
fi

if ! command -v kafkacat &> /dev/null; then
  echo "Error: kafkacat is not installed. Please install it (e.g., apt-get install kafkacat)." >&2
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "Error: jq is not installed. Please install it (e.g., apt-get install jq)." >&2
  exit 1
fi


echo "Replaying messages from DLQ '$SRC_TOPIC' to '$DST_TOPIC'..."

# 1. Consume all messages from the beginning of the DLQ topic.
# 2. Pipe to jq to transform the payload: remove the 'error' field and add a 'REPLAYED' event status.
# 3. Pipe the transformed messages to the destination topic.
kafkacat -b "$KAFKA_BROKERS" -C -o beginning -t "$SRC_TOPIC" -e | \
  jq -c 'del(.error) | .event="REPLAYED"' | \
  kafkacat -b "$KAFKA_BROKERS" -t "$DST_TOPIC" -P

echo "Replay complete."
