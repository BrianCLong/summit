#!/bin/bash
# Placeholder load profile for subscriptions soak test
set -e
echo "Simulating 10x load profile"
for i in {1..5}; do
  echo "Burst $i";
  sleep 1;
done
