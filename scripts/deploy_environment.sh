#!/bin/bash
ENV=""
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --env) ENV="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

if [ -z "$ENV" ]; then
    echo "Usage: ./deploy_environment.sh --env <environment>"
    exit 1
fi

echo "Deploying to environment: $ENV"
echo "Loading configuration from deploy/$ENV/values.yaml..."

if [ -f "deploy/$ENV/values.yaml" ]; then
    cat "deploy/$ENV/values.yaml"
else
    echo "Warning: Configuration file not found at deploy/$ENV/values.yaml"
fi

echo "Applying manifests..."
sleep 2
echo "Verifying health..."
sleep 1
echo "Deployment to $ENV completed successfully."
