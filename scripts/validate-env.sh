#!/usr/bin/env bash

#
# Local Environment Validator
#
# Checks for required dependencies and available ports to ensure the
# Summit development environment can start up successfully.
#

set -euo pipefail

# --- Color Codes ---
COLOR_RESET='\033[0m'
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_CYAN='\033[0;36m'

# --- State ---
EXIT_CODE=0

# --- Helper Functions ---

# Print a formatted header message.
#
# Arguments:
#   $1: The message to print.
#
# Examples:
#   print_header "✅ Validating Dependencies"
#
print_header() {
  printf "\n${COLOR_CYAN}===[ %s ]===${COLOR_RESET}\n" "$1"
}

# Print a success message.
#
# Arguments:
#   $1: The message to print.
#
# Examples:
#   print_success "Docker is running."
#
print_success() {
  printf "${COLOR_GREEN}✔ %s${COLOR_RESET}\n" "$1"
}

# Print a failure message and set the exit code to 1.
#
# Arguments:
#   $1: The message to print.
#
# Examples:
#   print_failure "Docker is not running."
#
print_failure() {
  printf "${COLOR_RED}✖ %s${COLOR_RESET}\n" "$1" >&2
  EXIT_CODE=1
}

# Check if a command exists on the PATH.
#
# Arguments:
#   $1: The name of the command to check.
#
# Returns:
#   0 if the command exists, 1 otherwise.
#
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check the version of a command-line tool.
#
# Arguments:
#   $1: The name of the tool (e.g., "Node.js").
#   $2: The command to run to get the version (e.g., "node").
#   $3: The required major version number.
#
# Examples:
#   check_version "Node.js" "node" 18
#
check_version() {
  local tool_name=$1
  local command_name=$2
  local required_major_version=$3
  local version_string
  local major_version

  if ! command_exists "$command_name"; then
    print_failure "$tool_name is not installed. Please install it and ensure it's on your PATH."
    return
  fi

  version_string=$($command_name --version)
  # Extracts the major version number (e.g., "v18.12.0" -> "18")
  major_version=$(echo "$version_string" | sed -e 's/v//' -e 's/\..*//')

  if [[ "$major_version" -lt "$required_major_version" ]]; then
    print_failure "$tool_name version is too old. Found ${version_string}, but v${required_major_version}+ is required."
  else
    print_success "$tool_name is installed (version ${version_string})."
  fi
}

# --- Validation Functions ---

validate_dependencies() {
  print_header "✅ Validating Dependencies"

  # Docker
  if ! command_exists "docker"; then
    print_failure "Docker is not installed. Please install Docker Desktop."
  elif ! docker info >/dev/null 2>&1; then
    print_failure "Docker is not running. Please start Docker Desktop."
  else
    print_success "Docker is installed and running."
  fi

  # Node.js, pnpm, Python
  check_version "Node.js" "node" 18
  check_version "pnpm" "pnpm" 9
  check_version "Python" "python" 3
}

validate_ports() {
  print_header "✅ Validating Required Ports"

  local required_ports=(3000 4000 5432 6379 7474 7687 8080)
  local port_checker_cmd=""
  local is_in_use=0

  # Use `lsof` on macOS/Linux, fall back to `netstat` if not available
  if command_exists "lsof"; then
    port_checker_cmd="lsof -i -P -n"
  elif command_exists "netstat"; then
    # `netstat` is less reliable and has different flags across OSs, but is a decent fallback.
    # This works for Linux `netstat-nat`.
    port_checker_cmd="netstat -tuln"
  else
    printf "${COLOR_YELLOW}Warning: Cannot find 'lsof' or 'netstat'. Skipping port checks.${COLOR_RESET}\n"
    return
  fi

  for port in "${required_ports[@]}"; do
    if ${port_checker_cmd} | grep -q ":${port}"; then
      print_failure "Port ${port} is already in use."
      is_in_use=1
    fi
  done

  if [[ "$is_in_use" -eq 0 ]]; then
    print_success "All required ports are available."
  fi
}

# --- Main Execution ---

main() {
  validate_dependencies
  validate_ports

  if [[ "$EXIT_CODE" -eq 0 ]]; then
    print_header "🎉 Environment validation successful! You're ready to go."
  else
    print_header "❌ Environment validation failed. Please fix the issues above and re-run the script."
  fi

  exit "$EXIT_CODE"
}

main
