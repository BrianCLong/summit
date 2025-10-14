#!/usr/bin/env bash
set -euo pipefail

# Sanity test merge-train helper scripts under zero-data conditions.
# Provides mocks for gh and git log to ensure division guards behave.

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

export REAL_GIT_BIN=$(command -v git)

cat >"$TMP_DIR/git" <<'EOF'
#!/usr/bin/env bash
REAL_GIT="${REAL_GIT_BIN:-git}"
if [[ "$1" == "log" ]]; then
  # Simulate zero commits returned for any git log invocation.
  exit 0
fi
exec "$REAL_GIT" "$@"
EOF

chmod +x "$TMP_DIR/git"

cat >"$TMP_DIR/gh" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  pr)
    if [[ "$2" == "list" ]]; then
      echo "[]"
      exit 0
    fi
    ;;
  run)
    if [[ "$2" == "list" ]]; then
      echo "[]"
      exit 0
    fi
    ;;
  issue)
    if [[ "$2" == "create" ]]; then
      echo "{}"
      exit 0
    fi
    ;;
esac
echo "[]"
exit 0
EOF

chmod +x "$TMP_DIR/gh"

export PATH="$TMP_DIR:$PATH"
export GH_TOKEN="dummy-token"

echo "Running merge-train-health-dashboard.sh in zero-state mock..."
"$ROOT_DIR"/scripts/merge-train-health-dashboard.sh >"$TMP_DIR/health.log"

echo "Running conflict-hotspot-report.sh in zero-state mock..."
"$ROOT_DIR"/scripts/conflict-hotspot-report.sh 30 5 >"$TMP_DIR/hotspot.log"

if ! grep -q "No data" /tmp/hotspot-report.csv; then
  echo "Expected hotspot report to include 'No data' marker" >&2
  exit 1
fi

echo "Zero-state merge train helpers succeeded."
