#!/bin/bash
# Minimal implementation of containment script

ACTION=""
SEVERITY=""
QUEUE=""
MODEL=""
JOB_ID=""
IP=""
READ_ONLY=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --action) ACTION="$2"; shift ;;
        --severity) SEVERITY="$2"; shift ;;
        --queue) QUEUE="$2"; shift ;;
        --model) MODEL="$2"; shift ;;
        --job-id) JOB_ID="$2"; shift ;;
        --ip) IP="$2"; shift ;;
        --read-only) READ_ONLY="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo "[CONTAINMENT] Applying action: $ACTION"

case $ACTION in
    restrict_traffic)
        echo "[CONTAINMENT] Restricting traffic for severity: $SEVERITY"
        echo "[CONTAINMENT] (Mock) Applied rate limiting rules to Nginx/Gateway"
        ;;
    pause_queue)
        echo "[CONTAINMENT] Pausing queue: $QUEUE"
        echo "[CONTAINMENT] (Mock) BullMQ queue paused"
        ;;
    degrade_model)
        echo "[CONTAINMENT] Downgrading model to: $MODEL"
        echo "[CONTAINMENT] (Mock) Updated LLM config"
        ;;
    kill_job)
        echo "[CONTAINMENT] Killing job ID: $JOB_ID"
        echo "[CONTAINMENT] (Mock) Job terminated"
        ;;
    block_ip)
        echo "[CONTAINMENT] Blocking IP: $IP"
        echo "[CONTAINMENT] (Mock) IP added to WAF deny list"
        ;;
    maintenance_mode)
        echo "[CONTAINMENT] Setting Maintenance Mode. Read-only: $READ_ONLY"
        echo "[CONTAINMENT] (Mock) System set to maintenance mode"
        ;;
    *)
        echo "Unknown action: $ACTION"
        exit 1
        ;;
esac

exit 0
