#!/bin/bash

PROJECT_ROOT="$(dirname "$(realpath "$0")")"

BACKEND_DIR="$PROJECT_ROOT/conductor-ui/backend"
FRONTEND_DIR="$PROJECT_ROOT/conductor-ui/frontend"

BACKEND_PID_FILE="/tmp/conductor_backend.pid"
FRONTEND_PID_FILE="/tmp/conductor_frontend.pid"

BACKEND_LOG_FILE="/tmp/conductor_backend.log"
FRONTEND_LOG_FILE="/tmp/conductor_frontend.log"

function start_backend() {
    echo "Starting backend..."
    cd "$BACKEND_DIR" || exit
    node server.js > "$BACKEND_LOG_FILE" 2>&1 & echo $! > "$BACKEND_PID_FILE"
    echo "Backend started with PID $(cat "$BACKEND_PID_FILE") (logs in $BACKEND_LOG_FILE)"
}

function start_frontend() {
    echo "Starting frontend..."
    cd "$FRONTEND_DIR" || exit
    npm run dev > "$FRONTEND_LOG_FILE" 2>&1 & echo $! > "$FRONTEND_PID_FILE"
    echo "Frontend started with PID $(cat "$FRONTEND_PID_FILE") (logs in $FRONTEND_LOG_FILE)"
}

function stop_all() {
    echo "Stopping all conductor processes..."
    if [ -f "$BACKEND_PID_FILE" ]; then
        kill "$(cat "$BACKEND_PID_FILE")" 2>/dev/null
        rm "$BACKEND_PID_FILE"
        echo "Backend stopped."
    fi
    if [ -f "$FRONTEND_PID_FILE" ]; then
        kill "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null
        rm "$FRONTEND_PID_FILE"
        echo "Frontend stopped."
    fi
}

function status_all() {
    echo "Conductor Status:"
    if [ -f "$BACKEND_PID_FILE" ] && ps -p "$(cat "$BACKEND_PID_FILE")" > /dev/null; then
        echo "Backend: RUNNING (PID $(cat "$BACKEND_PID_FILE"))"
    else
        echo "Backend: STOPPED"
    fi
    if [ -f "$FRONTEND_PID_FILE" ] && ps -p "$(cat "$FRONTEND_PID_FILE")" > /dev/null; then
        echo "Frontend: RUNNING (PID $(cat "$FRONTEND_PID_FILE"))"
    else
        echo "Frontend: STOPPED"
    fi
}

case "$1" in
    start)
        start_backend
        start_frontend
        status_all
        ;;
    stop)
        stop_all
        status_all
        ;;
    status)
        status_all
        ;;
    *)
        echo "Usage: $0 {start|stop|status}"
        ;;
esac
