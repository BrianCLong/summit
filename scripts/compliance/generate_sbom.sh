#!/bin/bash
set -euo pipefail

# Summit SBOM Generator
# Uses Syft to generate CycloneDX SBOMs for all build artifacts

OUTPUT_DIR=${1:-"compliance/sbom"}
mkdir -p "$OUTPUT_DIR"

echo "Generating SBOMs for Summit..."

# Check if Syft is available
if command -v syft &> /dev/null; then
  declare -A SEEN_PATHS=()

  add_sbom() {
    local name="$1"
    local path="$2"

    if [[ -z "$name" || -z "$path" || ! -d "$path" ]]; then
      return
    fi

    if [[ -n "${SEEN_PATHS[$path]:-}" ]]; then
      return
    fi

    echo "Generating ${name} SBOM..."
    syft dir:"$path" -o cyclonedx-json > "$OUTPUT_DIR/${name}-sbom.json"
    SEEN_PATHS["$path"]=1
  }

  # Server SBOM
  if [ -f server/package.json ]; then
    add_sbom "server" "server"
  fi

  # Client SBOM
  if [ -f client/package.json ]; then
    add_sbom "client" "client"
  fi

  # Summit Web App SBOM
  if [ -f apps/web/package.json ]; then
    add_sbom "web" "apps/web"
  fi

  # PSC Runner SBOM (Rust)
  if [ -f rust/psc-runner/Cargo.toml ]; then
    add_sbom "psc-runner" "rust/psc-runner"
  fi

  for root in apps packages services workers; do
    if [ -d "$root" ]; then
      for dir in "$root"/*; do
        if [ -d "$dir" ]; then
          if [ -f "$dir/package.json" ] || [ -f "$dir/pyproject.toml" ] || [ -f "$dir/requirements.txt" ] || [ -f "$dir/Cargo.toml" ]; then
            name="${root}-$(basename "$dir")"
            add_sbom "$name" "$dir"
          fi
        fi
      done
    fi
  fi
else
  echo "Warning: Syft not found. Generating mock SBOMs for environment where Syft is unavailable."
  echo '{"bomFormat": "CycloneDX", "specVersion": "1.4", "note": "MOCK_SBOM"}' > "$OUTPUT_DIR/server-sbom.json"
  echo '{"bomFormat": "CycloneDX", "specVersion": "1.4", "note": "MOCK_SBOM"}' > "$OUTPUT_DIR/client-sbom.json"
fi

echo "SBOM generation complete. Artifacts in $OUTPUT_DIR"
