#!/usr/bin/env bash
set -euo pipefail

ALERT_NAME=${1:-}

if [[ -z "${ALERT_NAME}" ]]; then
  echo "Usage: $0 <AlertName>" >&2
  exit 1
fi

ALERT_PAYLOAD="ops/runbooks/generated/alerts/${ALERT_NAME}.json"
PROPOSAL_FILE=$(mktemp -t "${ALERT_NAME}-proposal-XXXX.json")

if [[ ! -f "${ALERT_PAYLOAD}" ]]; then
  echo "Alert payload ${ALERT_PAYLOAD} not found. Run generate_alert_runbooks.py first." >&2
  exit 1
fi

echo "🔎 Generating remediation proposal for ${ALERT_NAME}..."
python ops/remediator/propose.py --from "${ALERT_PAYLOAD}" --out "${PROPOSAL_FILE}"

PROPOSAL_ID=$(python - <<'PY'
import json, sys
with open(sys.argv[1]) as fh:
    data = json.load(fh)
print(data.get("proposal_id", ""))
PY
"${PROPOSAL_FILE}")

if [[ -z "${PROPOSAL_ID}" ]]; then
  echo "Unable to extract proposal_id from ${PROPOSAL_FILE}" >&2
  exit 1
fi

echo "🚀 Executing remediation for proposal ${PROPOSAL_ID}..."
python ops/remediator/propose.py --execute "${PROPOSAL_ID}" --approver "one-click-bot"

echo "✅ Remediation submitted. Evidence stored in ops/remediator/evidence/v0.3.6/remediation"
