#!/bin/bash

set -e

echo "🔧 Installing dependencies..."
npm install --legacy-peer-deps
cd client && npm install --legacy-peer-deps && cd ..

echo "⚙️ Building frontend..."
cd client && npm run build && cd ..

echo "🚀 Starting backend server..."
NODE_ENV=production node server/index.js
#!/bin/bash

set -e

echo "🔧 Installing dependencies..."
npm install --legacy-peer-deps
cd client && npm install --legacy-peer-deps && cd ..

echo "⚙️ Building frontend..."
cd client && npm run build && cd ..

echo "🚀 Starting backend server..."
NODE_ENV=production node server/index.js
