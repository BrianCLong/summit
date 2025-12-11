#!/bin/bash
FEATURE=""
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --feature) FEATURE="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo "Rolling back feature: $FEATURE"
sleep 1
echo "Feature rolled back successfully."
