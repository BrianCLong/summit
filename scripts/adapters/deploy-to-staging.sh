#!/usr/bin/env bash
set -euo pipefail

# Adapter staging bootstrapper
# - Verifies a signed adapter bundle
# - Extracts it into the staging install path
# - Applies the provided config file

INSTALL_DIR=${INSTALL_DIR:-/opt/summit/adapters}
CONFIG_DIR=${CONFIG_DIR:-/etc/summit/adapters}
COSIGN_PUB_KEY=${COSIGN_PUB_KEY:-}

say() { printf "\n\033[1;34m== %s ==\033[0m\n" "$*"; }
pass() { printf "\033[1;32m✅ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m⚠️  %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m❌ %s\033[0m\n" "$*"; exit 1; }

usage() {
  cat <<'EOF'
Usage: deploy-to-staging.sh --bundle <bundle.tgz> --signature <bundle.tgz.sig> [--config <config-file>]

Environment overrides:
  INSTALL_DIR   Target directory for unpacked adapters (default: /opt/summit/adapters)
  CONFIG_DIR    Target directory for adapter configs (default: /etc/summit/adapters)
  COSIGN_PUB_KEY  Path to cosign public key (required)

Examples:
  COSIGN_PUB_KEY=./keys/cosign.pub \
    scripts/adapters/deploy-to-staging.sh \
      --bundle dist/adapters/my-adapter.tgz \
      --signature dist/adapters/my-adapter.tgz.sig \
      --config deploy/my-adapter.config.yaml
EOF
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing dependency: $1"
}

main() {
  local bundle=""
  local signature=""
  local config_file=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --bundle) bundle=${2:-}; shift 2 ;;
      --signature) signature=${2:-}; shift 2 ;;
      --config) config_file=${2:-}; shift 2 ;;
      --help) usage; exit 0 ;;
      *) fail "Unknown argument: $1" ;;
    esac
  done

  [[ -z "$bundle" || -z "$signature" ]] && { usage; fail "Bundle and signature are required"; }
  [[ -z "${COSIGN_PUB_KEY}" ]] && fail "Set COSIGN_PUB_KEY to the public key path used for signing"

  [[ -f "$bundle" ]] || fail "Bundle not found: $bundle"
  [[ -f "$signature" ]] || fail "Signature not found: $signature"

  require_cmd cosign
  require_cmd tar
  require_cmd sha256sum

  say "Verifying signature"
  cosign verify-blob --key "$COSIGN_PUB_KEY" --signature "$signature" "$bundle" >/dev/null \
    || fail "Signature verification failed"
  pass "Signature verified"

  if [[ -f "${bundle}.sha256" ]]; then
    say "Checking SHA256 digest"
    local expected actual
    expected=$(cut -d' ' -f1 < "${bundle}.sha256")
    actual=$(sha256sum "$bundle" | cut -d' ' -f1)
    [[ "$expected" == "$actual" ]] || fail "Digest mismatch (expected $expected, got $actual)"
    pass "Digest matches ${bundle}.sha256"
  else
    warn "No ${bundle}.sha256 file found; skipping digest check"
  fi

  local bundle_name adapter_dir
  bundle_name=$(basename "$bundle")
  adapter_dir="${bundle_name%.tgz}"

  say "Preparing install path"
  rm -rf "$INSTALL_DIR/$adapter_dir"
  mkdir -p "$INSTALL_DIR/$adapter_dir"
  tar -xzf "$bundle" -C "$INSTALL_DIR/$adapter_dir"
  pass "Bundle extracted to $INSTALL_DIR/$adapter_dir"

  if [[ -n "$config_file" ]]; then
    [[ -f "$config_file" ]] || fail "Config file not found: $config_file"
    mkdir -p "$CONFIG_DIR"
    cp "$config_file" "$CONFIG_DIR/${adapter_dir}.config"
    pass "Config copied to $CONFIG_DIR/${adapter_dir}.config"
  else
    warn "No config file provided; adapter will use defaults/environment"
  fi

  cat <<EOF

Next steps:
- Restart the gateway or reload adapters if hot-reload is disabled.
- Confirm GraphQL schema includes "${adapter_dir}" fields.
- Validate downstream connectivity with a smoke query against staging.
EOF
}

main "$@"
