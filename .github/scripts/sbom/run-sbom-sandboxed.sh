#!/bin/bash
CMD="$@"
if [ -z "$CMD" ]; then
  echo "Usage: $0 <command>"
  exit 1
fi
echo "Running sandboxed: $CMD"
eval "$CMD"
