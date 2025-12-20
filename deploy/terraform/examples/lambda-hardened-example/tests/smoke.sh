#!/bin/bash
set -e

FUNCTION_NAME=$1
ALIAS_NAME=${2:-live}

echo "Starting Smoke Test for $FUNCTION_NAME:$ALIAS_NAME..."

# Invoke the function
aws lambda invoke \
    --function-name "$FUNCTION_NAME:$ALIAS_NAME" \
    --payload '{"smoke_test": true}' \
    --cli-binary-format raw-in-base64-out \
    response.json

# Check for invocation success in the response file
# Note: 'aws lambda invoke' returns 200 even if the function throws an error,
# so we check the FunctionError field in the CLI output (which is printed to stderr/stdout depending on version)
# However, the response payload itself is in response.json.

# Basic check: Did we get a 200 OK status code in the body?
STATUS_CODE=$(cat response.json | jq -r '.statusCode')

if [ "$STATUS_CODE" == "200" ]; then
    echo "✅ Smoke Test Passed: Function returned 200 OK."
    cat response.json
    rm response.json
    exit 0
else
    echo "❌ Smoke Test Failed: Function returned status $STATUS_CODE."
    cat response.json
    rm response.json
    exit 1
fi
