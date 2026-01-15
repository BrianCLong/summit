#!/usr/bin/env bash
set -e

APP_NAME=$1
NAMESPACE=${2:-default}

if [ -z "$APP_NAME" ]; then
  echo "Usage: ./scripts/emergency-rollback.sh <app-name> [namespace]"
  echo "Example: ./scripts/emergency-rollback.sh maestro"
  exit 1
fi

echo "🚨 INITIATING EMERGENCY ROLLBACK FOR: $APP_NAME ($NAMESPACE) 🚨"
echo "Reading history..."
helm history $APP_NAME -n $NAMESPACE --max 3

echo ""
echo "Rolling back to previous release..."
helm rollback $APP_NAME 0 -n $NAMESPACE

echo "✅ Rollback command sent."
echo "Monitoring rollout status..."
kubectl rollout status deployment/$APP_NAME -n $NAMESPACE

echo "🎉 Service is stable on previous version."
