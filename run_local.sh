#!/bin/bash

# --- Environment Variables ---
# Set your local environment variables here.
# These are examples; adjust them to match your application's needs.
export SUMMIT_DEBUG=True
export SUMMIT_API_KEY="your_local_dev_api_key"
export DATABASE_URL="sqlite:///./local.db"
export PORT=8080

echo "Starting Summit application locally..."
echo "Environment Variables set:"
echo "  SUMMIT_DEBUG=$SUMMIT_DEBUG"
echo "  SUMMIT_API_KEY=$SUMMIT_API_KEY"
echo "  DATABASE_URL=$DATABASE_URL"
echo "  PORT=$PORT"
echo ""

# Run your Python application
# Assuming your main application entry point is main.py
python main.py
