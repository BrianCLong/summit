#!/bin/bash

set -e

# Configuration
URL=$1

if [ -z "$URL" ]; then
  echo "Usage: $0 <url>"
  exit 1
fi

echo "Performing canary health check on ${URL}..."
response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${URL}")

if [ "${response}" -ne 200 ]; then
  echo "Canary health check failed with status code ${response}."
  exit 1
fi

echo "Canary health check successful."
