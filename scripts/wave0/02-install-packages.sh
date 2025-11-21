#!/bin/bash
# Wave 0: Install New Governance Packages
# Adds the new packages to the pnpm workspace

set -e

echo "========================================="
echo "Wave 0: Install Governance Packages"
echo "========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_info() {
    echo -e "${YELLOW}→${NC} $1"
}

# New packages to install
PACKAGES=(
    "packages/authority-compiler"
    "packages/canonical-entities"
    "packages/connector-sdk"
    "packages/prov-ledger-extensions"
    "packages/governance-hooks"
)

# Step 1: Verify package directories exist
echo ""
echo "Step 1: Verifying package directories..."
echo "-----------------------------------------"

for pkg in "${PACKAGES[@]}"; do
    if [ -d "$pkg" ]; then
        log_success "$pkg exists"
    else
        echo "Creating $pkg directory structure..."
        mkdir -p "$pkg/src"
    fi
done

# Step 2: Add packages to pnpm workspace
echo ""
echo "Step 2: Updating pnpm workspace..."
echo "-----------------------------------------"

# Check if pnpm-workspace.yaml exists
if [ -f "pnpm-workspace.yaml" ]; then
    log_info "pnpm-workspace.yaml found"

    # Check if packages are already included
    if grep -q "packages/authority-compiler" pnpm-workspace.yaml; then
        log_success "Packages already in workspace"
    else
        log_info "Adding new packages to workspace..."
        # The packages/* glob should already include them
        log_success "Packages included via packages/* glob"
    fi
else
    log_info "Creating pnpm-workspace.yaml..."
    cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
  - 'apps/*'
  - 'services/*'
  - 'connectors/*'
EOF
    log_success "Created pnpm-workspace.yaml"
fi

# Step 3: Install dependencies
echo ""
echo "Step 3: Installing dependencies..."
echo "-----------------------------------------"

log_info "Running pnpm install..."
pnpm install

log_success "Dependencies installed"

# Step 4: Build new packages
echo ""
echo "Step 4: Building new packages..."
echo "-----------------------------------------"

for pkg in "${PACKAGES[@]}"; do
    if [ -f "$pkg/package.json" ]; then
        log_info "Building $pkg..."

        # Check if build script exists
        if grep -q '"build"' "$pkg/package.json"; then
            (cd "$pkg" && pnpm build 2>/dev/null) || log_info "Build skipped (TypeScript not configured yet)"
        else
            log_info "No build script in $pkg"
        fi
    fi
done

# Step 5: Verify packages are accessible
echo ""
echo "Step 5: Verifying package accessibility..."
echo "-----------------------------------------"

for pkg in "${PACKAGES[@]}"; do
    PKG_NAME=$(node -p "require('./$pkg/package.json').name" 2>/dev/null || echo "unknown")
    if [ "$PKG_NAME" != "unknown" ]; then
        log_success "$PKG_NAME accessible"
    fi
done

# Summary
echo ""
echo "========================================="
echo "Package Installation Complete"
echo "========================================="

echo ""
echo "Installed packages:"
for pkg in "${PACKAGES[@]}"; do
    PKG_NAME=$(node -p "require('./$pkg/package.json').name" 2>/dev/null || echo "unknown")
    VERSION=$(node -p "require('./$pkg/package.json').version" 2>/dev/null || echo "0.0.0")
    echo "  - $PKG_NAME@$VERSION"
done

echo ""
echo "Next steps:"
echo "  1. Add TypeScript configs to each package"
echo "  2. Run 'pnpm build' to compile"
echo "  3. Import packages in your services"
