#!/bin/bash
set -euo pipefail

# Get current date and commit SHA
DATE=$(date +%Y-%m-%d)
SHORT_SHA=$(git rev-parse --short HEAD)

# Define directories
OUTPUT_DIR="artifacts/review-pack/${DATE}/${SHORT_SHA}"
SOURCE_DOCS_DIR="docs/review-pack"
MANIFEST_FILE="${OUTPUT_DIR}/manifest.json"

# Create the output directory
mkdir -p "${OUTPUT_DIR}"
echo "Created review pack directory: ${OUTPUT_DIR}"

# --- Copy Files ---
echo "Copying review pack documents..."
cp -v "${SOURCE_DOCS_DIR}"/* "${OUTPUT_DIR}/"

# List of additional files to copy if they exist
ADDITIONAL_FILES=(
  "docs/compliance/CONTROL_REGISTRY.md"
  "docs/compliance/CONTROL_CROSSWALK.md"
  "docs/compliance/EVIDENCE_INDEX.md"
  "docs/releases/GA_VERIFY.md"
  "docs/releases/GA_EVIDENCE.md"
  "docs/ops/RELIABILITY_POLICY.md"
)

echo "Copying additional compliance and release documents..."
for file in "${ADDITIONAL_FILES[@]}"; do
  if [ -f "$file" ]; then
    cp -v "$file" "${OUTPUT_DIR}/"
  else
    echo "Optional file not found, skipping: $file"
  fi
done

# --- Generate Manifest ---
echo "Generating manifest.json..."

# Start JSON
echo "{" > "${MANIFEST_FILE}"
echo "  \"repoSha\": \"${SHORT_SHA}\"," >> "${MANIFEST_FILE}"
echo "  \"generationDate\": \"${DATE}\"," >> "${MANIFEST_FILE}"
echo "  \"files\": [" >> "${MANIFEST_FILE}"

# Add file entries with hashes
first=true
# Use a subshell and process substitution to safely read file names
while IFS= read -r -d '' file; do
  if [ "$first" = false ]; then
    echo "," >> "${MANIFEST_FILE}"
  fi
  first=false
  filepath=$(basename "$file")
  hash=$(shasum -a 256 "$file" | awk '{print $1}')
  printf "    {\n      \"path\": \"%s\",\n      \"sha256\": \"%s\"\n    }" "${filepath}" "${hash}" >> "${MANIFEST_FILE}"
done < <(find "${OUTPUT_DIR}" -type f -not -name "manifest.json" -print0)


# End files array
echo "" >> "${MANIFEST_FILE}"
echo "  ]," >> "${MANIFEST_FILE}"

# Add key commands
echo "  \"keyCommands\": [" >> "${MANIFEST_FILE}"
echo "    {" >> "${MANIFEST_FILE}"
echo "      \"description\": \"Run GA verification checks\"," >> "${MANIFEST_FILE}"
echo "      \"command\": \"pnpm ga:verify\"" >> "${MANIFEST_FILE}"
echo "    }," >> "${MANIFEST_FILE}"
echo "    {" >> "${MANIFEST_FILE}"
echo "      \"description\": \"Run full GA gate (requires Docker)\"," >> "${MANIFEST_FILE}"
echo "      \"command\": \"make ga\"" >> "${MANIFEST_FILE}"
echo "    }," >> "${MANIFEST_FILE}"
echo "    {" >> "${MANIFEST_FILE}"
echo "      \"description\": \"Verify governance and living documents\"," >> "${MANIFEST_FILE}"
echo "      \"command\": \"pnpm verify:governance && pnpm verify:living-documents\"" >> "${MANIFEST_FILE}"
echo "    }" >> "${MANIFEST_FILE}"
echo "  ]" >> "${MANIFEST_FILE}"


# End JSON
echo "}" >> "${MANIFEST_FILE}"

echo "Manifest generation complete: ${MANIFEST_FILE}"
echo "Review pack contents:"
ls -l "${OUTPUT_DIR}"
