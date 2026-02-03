#!/bin/bash
# Setup script for Summit Runner 1 (Build Runner)
# Run this on Computer 1

set -e

echo "========================================"
echo "Summit Runner 1 - Build Runner Setup"
echo "========================================"
echo ""

# Configuration
RUNNER_NAME="summit-runner-1"
RUNNER_DIR="$HOME/actions-runner-1"
RUNNER_VERSION="2.331.0"
RUNNER_LABELS="self-hosted,linux,x64,summit-build"
REPO_URL="https://github.com/BrianCLong/summit"
REGISTRATION_TOKEN="ABQ3PQ24W6JLNATC7C2CEH3JPFMQW"

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "Error: This script is designed for Linux systems"
    exit 1
fi

# Create runner directory
echo "Creating runner directory: $RUNNER_DIR"
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

# Download runner package
echo "Downloading GitHub Actions runner v$RUNNER_VERSION..."
curl -o actions-runner-linux-x64-$RUNNER_VERSION.tar.gz -L \
    https://github.com/actions/runner/releases/download/v$RUNNER_VERSION/actions-runner-linux-x64-$RUNNER_VERSION.tar.gz

# Validate checksum
echo "Validating checksum..."
echo "5fcc01bd546ba5c3f1291c2803658ebd3cedb3836489eda3be357d41bfcf28a7  actions-runner-linux-x64-$RUNNER_VERSION.tar.gz" | shasum -a 256 -c

# Extract runner
echo "Extracting runner..."
tar xzf ./actions-runner-linux-x64-$RUNNER_VERSION.tar.gz

# Configure runner
echo ""
echo "Configuring runner: $RUNNER_NAME"
echo "Labels: $RUNNER_LABELS"
./config.sh \
    --url "$REPO_URL" \
    --token "$REGISTRATION_TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "$RUNNER_LABELS" \
    --unattended

# Install as service
echo ""
echo "Installing runner as system service..."
sudo ./svc.sh install $USER

# Start service
echo "Starting runner service..."
sudo ./svc.sh start

# Check status
echo ""
echo "Checking runner status..."
sudo ./svc.sh status

echo ""
echo "========================================"
echo "✓ Summit Runner 1 Setup Complete!"
echo "========================================"
echo ""
echo "Runner Details:"
echo "  Name: $RUNNER_NAME"
echo "  Directory: $RUNNER_DIR"
echo "  Labels: $RUNNER_LABELS"
echo "  Status: Running as system service"
echo ""
echo "Service Management:"
echo "  Status:  sudo $RUNNER_DIR/svc.sh status"
echo "  Stop:    sudo $RUNNER_DIR/svc.sh stop"
echo "  Start:   sudo $RUNNER_DIR/svc.sh start"
echo "  Restart: sudo $RUNNER_DIR/svc.sh restart"
echo ""
echo "Check runner in GitHub:"
echo "  https://github.com/BrianCLong/summit/settings/actions/runners"
echo ""
