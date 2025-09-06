#!/bin/bash
set -euo pipefail

# Maestro Production Build Script
echo "🚀 Building Maestro for production..."

# Environment setup
export NODE_ENV=production
export VITE_BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export VITE_BUILD_VERSION=${VITE_BUILD_VERSION:-"1.0.0"}

echo "📋 Build Configuration:"
echo "  - Environment: $NODE_ENV"
echo "  - Version: $VITE_BUILD_VERSION"
echo "  - Timestamp: $VITE_BUILD_TIMESTAMP"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Type checking
echo "🔍 Type checking..."
npm run type-check 2>/dev/null || npx tsc --noEmit

# Linting
echo "📝 Linting code..."
npm run lint --silent || echo "⚠️  Linting warnings found (continuing build)"

# Build with production config
echo "🏗️  Building application..."
if [ -f "vite.config.production.ts" ]; then
    echo "Using production Vite config"
    npx vite build --config vite.config.production.ts --mode production
else
    echo "Using default Vite config"
    npx vite build --mode production
fi

# Build verification
echo "✅ Verifying build..."
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    echo "❌ Build failed - index.html not found"
    exit 1
fi

# Build size analysis
echo "📊 Build size analysis:"
du -sh dist/
echo "📋 Asset breakdown:"
find dist/ -name "*.js" -o -name "*.css" | xargs ls -lh | sort -k5 -hr | head -10

# Generate build manifest
echo "📄 Generating build manifest..."
cat > dist/build-manifest.json << EOF
{
  "version": "$VITE_BUILD_VERSION",
  "timestamp": "$VITE_BUILD_TIMESTAMP",
  "nodeVersion": "$(node --version)",
  "buildHost": "$(hostname)",
  "gitCommit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "environment": "production"
}
EOF

# Security checks
echo "🔒 Running security checks..."

# Check for sensitive information in build
if grep -r "localhost" dist/ 2>/dev/null; then
    echo "⚠️  Found localhost references in production build"
fi

if grep -r "development" dist/ 2>/dev/null; then
    echo "⚠️  Found development references in production build" 
fi

# Generate integrity hashes
echo "🛡️  Generating integrity hashes..."
find dist/ -name "*.js" -o -name "*.css" | while read file; do
    hash=$(openssl dgst -sha384 -binary "$file" | openssl base64 -A)
    echo "${file}: sha384-${hash}" >> dist/integrity.txt
done

echo "✅ Production build completed successfully!"
echo ""
echo "📋 Next steps:"
echo "  - Review build in dist/ directory"
echo "  - Test with: npm run preview"
echo "  - Deploy to: maestro-dev.topicality.co"
echo ""
echo "📦 Build artifacts:"
ls -la dist/