#!/bin/bash
set -e

echo "Starting fresh onboarding..."

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo >&2 "Docker is required but not installed. Aborting."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo >&2 "pnpm is required but not installed. Aborting."; exit 1; }

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Environment setup
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

# Start docker services
echo "Starting docker services..."
docker compose up -d

# Wait for services (simple sleep for now, could be robustified)
echo "Waiting for services to be ready..."
sleep 10

# Run migrations if any (assuming db:migrate script exists)
echo "Running migrations..."
pnpm run db:migrate || echo "Warning: db:migrate failed or not defined"

echo "Setup complete! Platform should be running."
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:4000"
