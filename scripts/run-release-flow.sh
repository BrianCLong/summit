 #!/usr/bin/env bash
  set -euo pipefail

  SHA=$(git rev-parse HEAD)
  ARTIFACT_DIR="artifacts/ga-verify/${SHA}"
  STAMP="${ARTIFACT_DIR}/stamp.json"

  echo "=== 1. Run GA verify ==="
  pnpm ga:verify

  if [[ -f "${STAMP}" ]]; then
    echo "Stamp generated at ${STAMP}"
    cat "${STAMP}"
  else
    echo "ERROR: Stamp file not found (${STAMP})" >&2
    exit 1
  fi

  echo
  echo "=== 2. Dry-run release ==="
  pnpm release:cut --bump patch --dry-run

  echo
  echo "=== 3. Perform dry-run bump without GH release ==="
  pnpm release:cut --bump patch --skip-gh-release

  echo
  echo "=== Next steps ==="
  echo "• Inspect the generated changelog/tag above."
  echo "• Commit the stabilization changes (see draft message)."
  echo "• Push your branch and open a PR so CI can run the new config-preflight gate."

