#!/bin/bash

set -euo pipefail
IFS=$'\n\t'

echo "=== 🚀 IntelGraph Production Deployment ==="

# 1. Setup base directory
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BASE_DIR"
echo "Working directory: $BASE_DIR"

# 2. Install root and client dependencies
echo "🔧 Installing dependencies..."
npm install --legacy-peer-deps
cd client && npm install --legacy-peer-deps && cd ..

# 3. Build frontend
echo "⚙️ Building frontend..."
cd client && npm run build && cd ..

# 4. Serve frontend statically on port 4000
echo "🌐 Launching UI on http://localhost:4000..."
npx serve -s client/build -l 4000 &
UI_PID=$!

# 5. Start backend server (GraphQL, Express, etc.)
echo "🧠 Starting backend server..."
NODE_ENV=production node server/index.js &
BACKEND_PID=$!

# 6. Health checks (optional)
sleep 3
curl -Is http://localhost:4000 | head -n 1 || echo "⚠️ UI failed to respond on port 4000"

# 7. Wait to keep processes alive
wait $UI_PID $BACKEND_PID
