#!/usr/bin/env bash
set -euo pipefail
ID="${1:?preview id}"
NS="${2:?namespace}"

URL_FILE="/tmp/${ID}_url.txt"
URL="N/A"
[[ -f "$URL_FILE" ]] && URL=$(cat "$URL_FILE")

cat > /tmp/pr_comment.md <<EOF
🔍 **Preview Environment Ready**
- **Namespace:** \`${NS}\`
- **URL:** ${URL}
- **Traces:** Jaeger → service:${ID}
- **Metrics:** Grafana dashboard → namespace:${NS}

_This comment was posted by the preview workflow._
EOF

gh pr comment "$GITHUB_REF_NAME" -F /tmp/pr_comment.md || true
