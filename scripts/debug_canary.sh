#!/bin/bash
source scripts/production-canary.sh
prepare_deployment
echo "DEBUG: ORIGINAL_REPLICAS='$ORIGINAL_REPLICAS'"
