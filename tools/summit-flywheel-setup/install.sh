#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

print_usage() {
  cat <<'USAGE'
Summit Flywheel Setup (SFS) installer

Usage: install.sh [command] [options]

Commands:
  install         Run the installer (default)
  help            Show this help text
  version         Show installer version metadata

Options (scaffolding only; full semantics implemented in later phases):
  --help          Show help
  --yes           Non-interactive mode (reserved)
  --dry-run       Print planned actions without executing (reserved)
  --print-plan    Display the execution plan (reserved)

This is the scaffolding implementation (PR1). Core installer features, modules,
state handling, and safety rails will be added in subsequent PRs.
USAGE
}

print_version() {
  echo "sfs-installer 0.1.0-pr1"
}

run_install() {
  echo "[SFS] Installer scaffolding initialized."
  echo "[SFS] Core installation logic will arrive in subsequent PRs."
  echo "[SFS] Use './bin/sfs print-plan' for upcoming workflows once available."
}

COMMAND="install"
ARGS=()

for arg in "$@"; do
  case "$arg" in
    install)
      COMMAND="install"
      ;;
    help|--help|-h)
      COMMAND="help"
      ;;
    version|--version|-v)
      COMMAND="version"
      ;;
    --yes|--dry-run|--print-plan)
      # Reserved for upcoming phases; recorded for compatibility.
      ARGS+=("$arg")
      ;;
    *)
      # Preserve unknown args for forward compatibility but warn the user.
      echo "[SFS] Warning: unrecognized argument '$arg' (ignored in scaffolding)." >&2
      ;;
  esac
done

case "$COMMAND" in
  install)
    run_install "${ARGS[@]}"
    ;;
  help)
    print_usage
    ;;
  version)
    print_version
    ;;
  *)
    print_usage
    ;;
esac
