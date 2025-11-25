#!/bin/bash
VERSION=""
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --to-version) VERSION="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo "Rolling back deployment to version: $VERSION"
sleep 2
echo "Rollback complete."
