with open("scripts/ci/parity_check.sh") as f:
    content = f.read()

# Replace set -euo pipefail with our patch
patch = """set -euo pipefail

# Gracefully skip if missing secrets for fork PRs
if [ -z "${AWS_ROLE_ARN:-}" ] && [ "${CLOUD:-}" == "aws" ]; then
    echo "AWS_ROLE_ARN not set, skipping for fork PR."
    echo "{}" > parity_result.json
    python3 -c 'import sys; sys.exit(0)'
    exit_called="yes"
fi
if [ -z "${GCP_WORKLOAD_POOL:-}" ] && [ "${CLOUD:-}" == "gcp" ]; then
    echo "GCP_WORKLOAD_POOL not set, skipping for fork PR."
    echo "{}" > parity_result.json
    python3 -c 'import sys; sys.exit(0)'
    exit_called="yes"
fi
if [ -z "${AZURE_FEDERATED_ID:-}" ] && [ "${CLOUD:-}" == "azure" ]; then
    echo "AZURE_FEDERATED_ID not set, skipping for fork PR."
    echo "{}" > parity_result.json
    python3 -c 'import sys; sys.exit(0)'
    exit_called="yes"
fi

if [ "${exit_called:-no}" == "yes" ]; then
    exit_0_please=0
else
"""

content = content.replace("set -euo pipefail\n", patch)
content += "\nfi\n"

with open("scripts/ci/parity_check.sh", "w") as f:
    f.write(content)
