#!/bin/bash

# IntelGraph Quickstart Script
# Wraps the detailed start-dev-environment.sh for a streamlined experience.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting IntelGraph Quickstart..."

# Function to print usage
usage() {
    echo "Usage: ./quickstart.sh [command]"
    echo "Commands:"
    echo "  up      - Start the full development environment"
    echo "  down    - Stop the environment"
    echo "  logs    - View logs"
    echo "  help    - Show this help message"
}

# Check if an argument is provided
if [ $# -eq 0 ]; then
    usage
    exit 1
fi

COMMAND=$1

case $COMMAND in
    up)
        echo "📦 Setting up and starting containers..."
        bash "$SCRIPT_DIR/start-dev-environment.sh" start
        ;;
    down)
        echo "🛑 Stopping environment..."
        bash "$SCRIPT_DIR/start-dev-environment.sh" stop
        ;;
    logs)
        echo "📄 Streaming logs..."
        bash "$SCRIPT_DIR/start-dev-environment.sh" logs
        ;;
    help)
        usage
        ;;
    *)
        echo "❌ Unknown command: $COMMAND"
        usage
        exit 1
        ;;
esac

echo "✨ Done."
