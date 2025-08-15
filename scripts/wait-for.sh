#!/bin/bash

# wait-for.sh - Wait for a service to be available
# Usage: ./wait-for.sh <host:port> [timeout] [-- command args...]

set -e

host="$1"
timeout="${2:-30}"
shift 2

# If there's a -- in the arguments, everything after it is the command to run
cmd=""
if [ $# -gt 0 ] && [ "$1" = "--" ]; then
    shift
    cmd="$*"
fi

# Function to test if host:port is available
test_connection() {
    if command -v nc >/dev/null 2>&1; then
        nc -z $host 2>/dev/null
    elif command -v telnet >/dev/null 2>&1; then
        echo "quit" | telnet $host 2>/dev/null | grep -q "Connected"
    else
        # Fallback using timeout and /dev/tcp
        timeout 1 bash -c "cat < /dev/null > /dev/tcp/$host" 2>/dev/null
    fi
}

echo "Waiting for $host to be available..."

start_time=$(date +%s)
while ! test_connection; do
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))
    
    if [ $elapsed -ge $timeout ]; then
        echo "Timeout after ${timeout}s waiting for $host"
        exit 1
    fi
    
    echo "Still waiting for $host... (${elapsed}s/${timeout}s)"
    sleep 1
done

echo "$host is available!"

if [ -n "$cmd" ]; then
    echo "Executing: $cmd"
    exec $cmd
fi