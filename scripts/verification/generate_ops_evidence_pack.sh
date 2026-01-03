#!/bin/bash
set -e

# Ops Evidence Pack Generator
# deterministically packages verification outputs

# 1. Compute variables
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
SHORTSHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BASE_DIR="artifacts/ops-evidence"
PACK_DIR="${BASE_DIR}/${TIMESTAMP}_${SHORTSHA}"
LOGS_DIR="${PACK_DIR}/LOGS"
ARTIFACTS_DIR="${PACK_DIR}/ARTIFACTS"
METADATA_FILE="${PACK_DIR}/METADATA.json"
MANIFEST_FILE="${PACK_DIR}/MANIFEST.json"
SUMMARY_FILE="${PACK_DIR}/SUMMARY.md"
TARBALL="${BASE_DIR}/${TIMESTAMP}_${SHORTSHA}.tar.gz"

echo "Generating Ops Evidence Pack at ${PACK_DIR}..."

# 2. Create output directory
mkdir -p "${LOGS_DIR}"
mkdir -p "${ARTIFACTS_DIR}"

# 3. Capture tool versions
NODE_VERSION=$(node --version 2>/dev/null || echo "not found")
PNPM_VERSION=$(pnpm --version 2>/dev/null || echo "not found")
DOCKER_VERSION=$(docker --version 2>/dev/null || echo "not found")
REMOTE_URL=$(git config --get remote.origin.url 2>/dev/null || echo "unknown")
COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

cat <<EOF > "${METADATA_FILE}"
{
  "commit_sha": "${COMMIT_SHA}",
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

# 4. Run verify_ops
echo "Running verify_ops..."
VERIFY_EXIT_CODE=0
./scripts/verification/verify_ops.sh > "${LOGS_DIR}/verify_ops.stdout.log" 2> "${LOGS_DIR}/verify_ops.stderr.log" || VERIFY_EXIT_CODE=$?

# 5. Copy artifacts (Mock step - assume validators might write to known locations or we copy from where verify_ops puts them)
# In this implementation, we assume verify_ops might output to artifacts/ops-validator-output based on the mock I created.
# A real implementation would need to know exactly where verify_ops writes.
if [ -d "artifacts/ops-validator-output" ]; then
  cp -r artifacts/ops-validator-output/* "${ARTIFACTS_DIR}/" 2>/dev/null || true
fi

# 6. Generate MANIFEST.json
echo "Generating manifest..."
# formatting as JSON list of objects { file, sha256 }
# using find and sha256sum. sort for determinism.
(cd "${PACK_DIR}" && find . -type f -not -name "MANIFEST.json" -exec sha256sum {} \;) | sort -k 2 | \
while read -r hash filename; do
  echo "{\"file\": \"${filename#./}\", \"sha256\": \"$hash\"},"
done | sed '$ s/,$//' | awk 'BEGIN {print "["} {print} END {print "]"}' > "${MANIFEST_FILE}"


# 7. Generate SUMMARY.md
if [ ${VERIFY_EXIT_CODE} -eq 0 ]; then
  RESULT="PASS"
  ICON="✅"
else
  RESULT="FAIL"
  ICON="❌"
fi

cat <<EOF > "${SUMMARY_FILE}"
# Ops Verification Summary

**Result:** ${ICON} ${RESULT}
**Generated At:** ${TIMESTAMP}
**Commit:** ${SHORTSHA}

## details
- Exit Code: ${VERIFY_EXIT_CODE}

## Logs
- [Standard Output](LOGS/verify_ops.stdout.log)
- [Standard Error](LOGS/verify_ops.stderr.log)

## Artifacts
$(ls "${ARTIFACTS_DIR}" | sort | awk '{print "- " $0}')
EOF

# 8. Create tarball
echo "Creating tarball..."
tar -czf "${TARBALL}" -C "${BASE_DIR}" "${TIMESTAMP}_${SHORTSHA}"

echo "Evidence pack generated: ${TARBALL}"

if [ ${VERIFY_EXIT_CODE} -ne 0 ]; then
  echo "Verification failed! See logs in evidence pack."
  exit ${VERIFY_EXIT_CODE}
fi
