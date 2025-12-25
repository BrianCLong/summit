#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <service-name> [target-dir]"
    exit 1
fi

SERVICE_NAME=$1
TARGET_DIR="${2:-examples/${SERVICE_NAME}}"
TEMPLATE_DIR="$(dirname "$0")/templates/service-ts"

# Resolve absolute path for template dir
TEMPLATE_DIR=$(cd "$TEMPLATE_DIR" && pwd)

echo "Scaffolding service '${SERVICE_NAME}' in '${TARGET_DIR}'..."

if [ -d "$TARGET_DIR" ]; then
    echo "Error: Directory '$TARGET_DIR' already exists."
    exit 1
fi

mkdir -p "$TARGET_DIR"
cp -r "$TEMPLATE_DIR"/* "$TARGET_DIR"
# Copy dotfiles explicitly if any (cp * skips them)
cp "$TEMPLATE_DIR"/.gitignore "$TARGET_DIR" 2>/dev/null || true
cp -r "$TEMPLATE_DIR"/.github "$TARGET_DIR" 2>/dev/null || true

# Replace placeholders
# We use find and sed. Linux and Mac compatible.
find "$TARGET_DIR" -type f -exec sed -i "s/{{SERVICE_NAME}}/${SERVICE_NAME}/g" {} +

echo "Service created successfully!"
echo "Next steps:"
echo "  cd ${TARGET_DIR}"
echo "  pnpm install"
echo "  pnpm dev"
