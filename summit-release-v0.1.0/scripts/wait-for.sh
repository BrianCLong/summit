#!/usr/bin/env bash
# wait-for host:port
set -e
HOSTPORT="$1"; shift || true
TIMEOUT="${TIMEOUT:-60}"
for i in $(seq 1 "$TIMEOUT"); do
  nc -z ${HOSTPORT%:*} ${HOSTPORT#*:} && exit 0
  sleep 1
  echo "waiting for $HOSTPORT ($i/$TIMEOUT)"
done
exit 1