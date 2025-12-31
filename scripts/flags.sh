#!/bin/bash
CMD=$1
FLAG=$2

if [ -z "$CMD" ]; then
    echo "Usage: ./flags.sh [enable|disable] <flag_name>"
    exit 1
fi

echo "[FLAGS] $CMD flag $FLAG"
echo "[FLAGS] (Mock) Flag updated successfully."
