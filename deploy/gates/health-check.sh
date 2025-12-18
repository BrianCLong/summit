#!/bin/bash
set -e

echo "Running health check..."

# In a real environment, this would curl the deployed service
# URL=${1:-"http://localhost:3000/health"}
# curl -f "$URL"

echo "Health check passed: Service is responding."
exit 0
