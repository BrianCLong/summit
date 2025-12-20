#!/bin/bash
BACKUP=""
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --backup) BACKUP="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo "Recovering storage from backup: $BACKUP"
sleep 1
echo "Data synchronization complete."
