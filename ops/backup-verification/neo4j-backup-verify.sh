#!/usr/bin/env bash
set -euo pipefail

required_vars=("AWS_REGION" "NEO4J_S3_BUCKET" "NEO4J_BACKUP_PREFIX")
for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "[neo4j] Missing required environment variable: ${var}" >&2
    exit 1
  fi
done

LATEST_KEY=${NEO4J_LATEST_KEY:-}
WORKDIR=$(mktemp -d)
LOG_DIR="${WORKDIR}/logs"
mkdir -p "${LOG_DIR}"
NEO4J_PID=0

cleanup() {
  if [[ ${NEO4J_PID} -ne 0 ]]; then
    kill "${NEO4J_PID}" >/dev/null 2>&1 || true
    wait "${NEO4J_PID}" >/dev/null 2>&1 || true
  fi
  rm -rf "${WORKDIR}"
}
trap cleanup EXIT

if command -v apk >/dev/null 2>&1; then
  apk --no-cache add aws-cli coreutils >/dev/null 2>&1 || true
elif command -v apt-get >/dev/null 2>&1; then
  apt-get update >/dev/null 2>&1
  apt-get install -y awscli >/dev/null 2>&1
fi

export NEO4J_HOME=${NEO4J_HOME:-/var/lib/neo4j}
export NEO4J_CONF=${NEO4J_CONF:-/var/lib/neo4j/conf}
export NEO4J_PLUGINS=${NEO4J_PLUGINS:-/var/lib/neo4j/plugins}
export JAVA_HOME=${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk}
export NEO4J_ACCEPT_LICENSE_AGREEMENT=${NEO4J_ACCEPT_LICENSE_AGREEMENT:-yes}
export NEO4J_AUTH=${NEO4J_AUTH:-none}

S3_PATH="s3://${NEO4J_S3_BUCKET}/${NEO4J_BACKUP_PREFIX}"
if [[ -z "${LATEST_KEY}" ]]; then
  echo "[neo4j] Discovering latest backup under ${S3_PATH}" | tee -a "${LOG_DIR}/verify.log"
  LATEST_KEY=$(aws s3 ls "${S3_PATH}/" --recursive | sort | tail -n1 | awk '{print $4}') || true
  if [[ -z "${LATEST_KEY}" ]]; then
    echo "[neo4j] No backups found under ${S3_PATH}" | tee -a "${LOG_DIR}/verify.log"
    exit 2
  fi
else
  echo "[neo4j] Using provided backup key ${LATEST_KEY}" | tee -a "${LOG_DIR}/verify.log"
fi

BACKUP_LOCAL="${WORKDIR}/backup.tar.gz"
echo "[neo4j] Downloading s3://${NEO4J_S3_BUCKET}/${LATEST_KEY}" | tee -a "${LOG_DIR}/verify.log"
aws s3 cp "s3://${NEO4J_S3_BUCKET}/${LATEST_KEY}" "${BACKUP_LOCAL}" --region "${AWS_REGION}" | tee -a "${LOG_DIR}/aws.log"

BACKUP_DIR="${WORKDIR}/backup"
mkdir -p "${BACKUP_DIR}"
tar -xzf "${BACKUP_LOCAL}" -C "${BACKUP_DIR}"

echo "[neo4j] Restoring backup into scratch database" | tee -a "${LOG_DIR}/verify.log"
RESTORE_DB=${NEO4J_DATABASE:-neo4j}
SCRATCH_DB="verify-${RESTORE_DB}"
neo4j-admin database restore "${SCRATCH_DB}" --from-path="${BACKUP_DIR}" --force --overwrite-destination=true | tee -a "${LOG_DIR}/verify.log"

echo "[neo4j] Running offline consistency check" | tee -a "${LOG_DIR}/verify.log"
neo4j-admin database check "${SCRATCH_DB}" --verbose | tee -a "${LOG_DIR}/check.log"

if grep -q "ERROR" "${LOG_DIR}/check.log"; then
  echo "[neo4j] Consistency check reported errors" | tee -a "${LOG_DIR}/verify.log"
  exit 3
fi

echo "[neo4j] Performing synthetic cypher workload" | tee -a "${LOG_DIR}/verify.log"
export NEO4J_dbms_default__database="${SCRATCH_DB}"
neo4j console >/dev/null 2>&1 &
NEO4J_PID=$!
sleep 25

if ! cypher-shell -a bolt://localhost:7687 -d "${SCRATCH_DB}" --format plain "MATCH (n) RETURN count(n) LIMIT 1;" >/dev/null 2>&1; then
  echo "[neo4j] Synthetic query failed" | tee -a "${LOG_DIR}/verify.log"
  exit 4
fi

echo "[neo4j] Backup verification succeeded" | tee -a "${LOG_DIR}/verify.log"
