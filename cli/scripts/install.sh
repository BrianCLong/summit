#!/bin/bash
# IntelGraph CLI Installer for Linux/macOS
set -e

REPO="BrianCLong/summit"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
VERSION="${VERSION:-latest}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Detect OS and architecture
detect_platform() {
    OS="$(uname -s)"
    ARCH="$(uname -m)"

    case "$OS" in
        Linux*)
            PLATFORM="linux"
            ;;
        Darwin*)
            PLATFORM="macos"
            if [ "$ARCH" = "arm64" ]; then
                PLATFORM="macos-arm64"
            fi
            ;;
        *)
            error "Unsupported operating system: $OS"
            ;;
    esac

    info "Detected platform: $PLATFORM ($ARCH)"
}

# Get latest version from GitHub
get_latest_version() {
    if [ "$VERSION" = "latest" ]; then
        VERSION=$(curl -sL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"cli-v([^"]+)".*/\1/' || echo "")
        if [ -z "$VERSION" ]; then
            error "Could not determine latest version"
        fi
    fi
    info "Installing version: $VERSION"
}

# Download binary
download_binary() {
    BINARY_NAME="intelgraph-$PLATFORM"
    DOWNLOAD_URL="https://github.com/$REPO/releases/download/cli-v$VERSION/$BINARY_NAME"

    info "Downloading from: $DOWNLOAD_URL"

    TMP_DIR=$(mktemp -d)
    TMP_FILE="$TMP_DIR/intelgraph"

    if command -v curl &> /dev/null; then
        curl -fsSL "$DOWNLOAD_URL" -o "$TMP_FILE" || error "Download failed"
    elif command -v wget &> /dev/null; then
        wget -q "$DOWNLOAD_URL" -O "$TMP_FILE" || error "Download failed"
    else
        error "curl or wget required"
    fi

    chmod +x "$TMP_FILE"
    echo "$TMP_FILE"
}

# Verify checksum
verify_checksum() {
    BINARY_PATH="$1"
    CHECKSUM_URL="https://github.com/$REPO/releases/download/cli-v$VERSION/intelgraph-$PLATFORM.sha256"

    info "Verifying checksum..."

    TMP_CHECKSUM=$(mktemp)
    curl -fsSL "$CHECKSUM_URL" -o "$TMP_CHECKSUM" 2>/dev/null || {
        warn "Could not verify checksum (checksum file not found)"
        return 0
    }

    EXPECTED=$(cat "$TMP_CHECKSUM" | awk '{print $1}')

    if command -v sha256sum &> /dev/null; then
        ACTUAL=$(sha256sum "$BINARY_PATH" | awk '{print $1}')
    elif command -v shasum &> /dev/null; then
        ACTUAL=$(shasum -a 256 "$BINARY_PATH" | awk '{print $1}')
    else
        warn "sha256sum not found, skipping verification"
        return 0
    fi

    if [ "$EXPECTED" != "$ACTUAL" ]; then
        error "Checksum verification failed"
    fi

    info "Checksum verified"
    rm -f "$TMP_CHECKSUM"
}

# Install binary
install_binary() {
    BINARY_PATH="$1"

    info "Installing to: $INSTALL_DIR/intelgraph"

    if [ ! -w "$INSTALL_DIR" ]; then
        warn "Need sudo to install to $INSTALL_DIR"
        sudo mv "$BINARY_PATH" "$INSTALL_DIR/intelgraph"
        sudo chmod +x "$INSTALL_DIR/intelgraph"
        # Create alias
        sudo ln -sf "$INSTALL_DIR/intelgraph" "$INSTALL_DIR/ig" 2>/dev/null || true
    else
        mv "$BINARY_PATH" "$INSTALL_DIR/intelgraph"
        chmod +x "$INSTALL_DIR/intelgraph"
        ln -sf "$INSTALL_DIR/intelgraph" "$INSTALL_DIR/ig" 2>/dev/null || true
    fi

    info "Installation complete!"
}

# Verify installation
verify_installation() {
    if command -v intelgraph &> /dev/null; then
        echo ""
        info "IntelGraph CLI installed successfully!"
        intelgraph --version
        echo ""
        info "Run 'intelgraph --help' to get started"
    else
        warn "Installation complete but 'intelgraph' not found in PATH"
        warn "Add $INSTALL_DIR to your PATH"
    fi
}

# Main
main() {
    echo "╔═══════════════════════════════════════╗"
    echo "║     IntelGraph CLI Installer          ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""

    detect_platform
    get_latest_version

    BINARY_PATH=$(download_binary)
    verify_checksum "$BINARY_PATH"
    install_binary "$BINARY_PATH"
    verify_installation

    # Cleanup
    rm -rf "$(dirname "$BINARY_PATH")"
}

main "$@"
