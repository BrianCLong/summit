#!/bin/bash
set -e

# Constants
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
SHORTSHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
OUTPUT_BASE="artifacts/ops-evidence"
PACK_NAME="${TIMESTAMP}_${SHORTSHA}"
PACK_DIR="${OUTPUT_BASE}/${PACK_NAME}"
TARBALL="${PACK_DIR}.tar.gz"

echo "Generating Ops Evidence Pack: ${PACK_NAME}"

# 1. Create directory structure
mkdir -p "${PACK_DIR}/LOGS"
mkdir -p "${PACK_DIR}/ARTIFACTS"

# 2. Capture Metadata
echo "Capturing metadata..."
NODE_VERSION=$(node -v 2>/dev/null || echo "missing")
PNPM_VERSION=$(pnpm -v 2>/dev/null || echo "missing")
DOCKER_VERSION=$(docker -v 2>/dev/null || echo "missing")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
REMOTE_URL=$(git config --get remote.origin.url 2>/dev/null || echo "unknown")

cat <<EOF > "${PACK_DIR}/METADATA.json"
{
  "commit_sha": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "branch": "${BRANCH}",
  "generated_at_utc": "${TIMESTAMP}",
  "repo_remote_url": "${REMOTE_URL}",
  "tool_versions": {
    "node": "${NODE_VERSION}",
    "pnpm": "${PNPM_VERSION}",
    "docker": "${DOCKER_VERSION}"
  }
}
EOF

# 3. Detect and Run verify_ops
echo "Locating verify_ops..."
VERIFY_SCRIPT=$(find scripts/verification -name "verify_ops.*" -print -quit)
VERIFY_CMD=""

if [ -z "$VERIFY_SCRIPT" ]; then
  echo "Error: scripts/verification/verify_ops.* not found."
  echo "scripts/verification/verify_ops.* not found" > "${PACK_DIR}/LOGS/verify_ops.stderr.log"
  VERIFY_EXIT_CODE=1
  VERIFY_CMD="(script not found)"
else
  echo "Running ${VERIFY_SCRIPT}..."
  VERIFY_EXIT_CODE=0
  chmod +x "$VERIFY_SCRIPT"
  VERIFY_CMD="${VERIFY_SCRIPT}"
  "$VERIFY_SCRIPT" > "${PACK_DIR}/LOGS/verify_ops.stdout.log" 2> "${PACK_DIR}/LOGS/verify_ops.stderr.log" || VERIFY_EXIT_CODE=$?
fi

# 4. Copy Artifacts
# Capture any JSON artifacts from the root artifacts/ folder, excluding the ops-evidence directory itself.
# We use a loop to avoid errors if no files match.
for f in artifacts/*.json; do
    [ -e "$f" ] || continue
    cp "$f" "${PACK_DIR}/ARTIFACTS/"
done

# 5. Generate Manifest (Valid JSON)
echo "Generating manifest..."

# Generate file list with checksums in JSON format
# We construct the JSON array manually using awk to ensure valid formatting
FILES_JSON=$(find "${PACK_DIR}" -type f ! -name "MANIFEST.json" -exec sha256sum {} + | \
  sed "s|${PACK_DIR}/||" | \
  awk 'BEGIN { print "[" } { printf "%s  {\"file\": \"%s\", \"sha256\": \"%s\"}", separator, $2, $1; separator=",\n" } END { print "]" }')

cat <<EOF > "${PACK_DIR}/MANIFEST.json"
{
  "files": ${FILES_JSON},
  "commands": [
    "${VERIFY_CMD}"
  ]
}
EOF

# 6. Generate Summary
echo "Generating summary..."
if [ $VERIFY_EXIT_CODE -eq 0 ]; then
  RESULT="PASS"
  ICON="✅"
else
  RESULT="FAIL"
  ICON="❌"
fi

cat <<EOF > "${PACK_DIR}/SUMMARY.md"
# Ops Evidence Pack Summary

**Result:** ${ICON} ${RESULT}
**Generated At:** ${TIMESTAMP}
**Commit:** ${SHORTSHA}

## Validation Details
Exit Code: ${VERIFY_EXIT_CODE}
Command Executed: \`${VERIFY_CMD}\`

## Logs
- [Standard Output](./LOGS/verify_ops.stdout.log)
- [Standard Error](./LOGS/verify_ops.stderr.log)

## Artifacts
See \`ARTIFACTS/\` directory for detailed outputs.
EOF

# 7. Create Tarball
echo "Creating tarball..."
tar -czf "${TARBALL}" -C "${OUTPUT_BASE}" "${PACK_NAME}"

echo "Ops Evidence Pack generated at: ${TARBALL}"

# Exit with the code from verify_ops
exit $VERIFY_EXIT_CODE
