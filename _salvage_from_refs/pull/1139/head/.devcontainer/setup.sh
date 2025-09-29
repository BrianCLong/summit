#!/bin/bash

echo "🚀 Setting up Maestro Conductor development environment..."

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Initialize services
echo "🗄️ Waiting for database services..."
sleep 10

# Run initial setup
echo "🔧 Running initial setup..."
npm run build || echo "Build failed - continuing setup"

# Setup Git hooks if available
if [ -f ".githooks/pre-commit" ]; then
    echo "🪝 Setting up Git hooks..."
    git config core.hooksPath .githooks
fi

# Initialize memory and cache
echo "🧠 Initializing memory system..."
mkdir -p .maestro/{memory,cache,analysis,fixes,loops,risk-scores}

# Create example configs
echo "📋 Creating example configurations..."
cat > .maestro/config.json << 'CONFIG_EOF'
{
  "agents": {
    "maxIterations": 5,
    "convergenceThreshold": 5
  },
  "memory": {
    "maxEntries": 10000,
    "defaultTTL": 604800
  },
  "router": {
    "dailyBudget": 50.0,
    "perRequestBudget": 5.0
  },
  "risk": {
    "autoMergeThreshold": 25,
    "reviewThreshold": 50,
    "blockThreshold": 75
  }
}
CONFIG_EOF

echo "✅ Development environment setup complete!"
echo "🎯 Available commands:"
echo "  - npm run agents:dev    # Run agents in dev mode"
echo "  - npm run test          # Run test suite"  
echo "  - npm run build         # Build the project"
echo "  - npm run lint          # Run linter"
echo "  - npm run typecheck     # Type checking"

echo ""
echo "🌟 Maestro Conductor v0.4 'Align & Automate' ready!"
