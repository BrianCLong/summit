#!/bin/bash
FEATURE=""
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --feature) FEATURE="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

if [ -z "$FEATURE" ]; then
    echo "Usage: ./merge_feature.sh --feature <feature-name>"
    exit 1
fi

echo "Initiating merge for feature: $FEATURE"
echo "Checking dependencies..."
sleep 1
echo "Running pre-merge checks..."
sleep 1
# Simulate git merge
echo "Merging feat/$FEATURE-v1 into main..."
# In a real scenario, this would be: git merge "feat/$FEATURE-v1"
echo "Successfully merged $FEATURE."
