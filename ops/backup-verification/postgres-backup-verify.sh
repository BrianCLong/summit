#!/usr/bin/env bash
set -euo pipefail

required_vars=("AWS_REGION" "POSTGRES_S3_BUCKET" "POSTGRES_BACKUP_PREFIX")
for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "[postgres] Missing required environment variable: ${var}" >&2
    exit 1
  fi
done

LATEST_KEY=${POSTGRES_LATEST_KEY:-}
WORKDIR=$(mktemp -d)
LOG_DIR="${WORKDIR}/logs"
mkdir -p "${LOG_DIR}"

cleanup() {
  if [[ -d "${WORKDIR}/pgdata" ]]; then
    if pg_ctl status -D "${WORKDIR}/pgdata" &>/dev/null; then
      pg_ctl -D "${WORKDIR}/pgdata" -m fast stop >/dev/null 2>&1 || true
    fi
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

S3_PATH="s3://${POSTGRES_S3_BUCKET}/${POSTGRES_BACKUP_PREFIX}"
if [[ -z "${LATEST_KEY}" ]]; then
  echo "[postgres] Discovering latest backup under ${S3_PATH}" | tee -a "${LOG_DIR}/verify.log"
  LATEST_KEY=$(aws s3 ls "${S3_PATH}/" --recursive | sort | tail -n1 | awk '{print $4}') || true
  if [[ -z "${LATEST_KEY}" ]]; then
    echo "[postgres] No backups found under ${S3_PATH}" | tee -a "${LOG_DIR}/verify.log"
    exit 2
  fi
else
  echo "[postgres] Using provided backup key ${LATEST_KEY}" | tee -a "${LOG_DIR}/verify.log"
fi

BACKUP_FILE="${WORKDIR}/backup.dump"
echo "[postgres] Downloading s3://${POSTGRES_S3_BUCKET}/${LATEST_KEY}" | tee -a "${LOG_DIR}/verify.log"
aws s3 cp "s3://${POSTGRES_S3_BUCKET}/${LATEST_KEY}" "${BACKUP_FILE}" --region "${AWS_REGION}" | tee -a "${LOG_DIR}/aws.log"

if ! pg_restore --list "${BACKUP_FILE}" >/dev/null; then
  echo "[postgres] Backup archive is corrupt" | tee -a "${LOG_DIR}/verify.log"
  exit 3
fi

echo "[postgres] Initializing ephemeral PostgreSQL cluster" | tee -a "${LOG_DIR}/verify.log"
initdb -D "${WORKDIR}/pgdata" >/dev/null
pg_ctl -D "${WORKDIR}/pgdata" -o "-k ${WORKDIR} -p 55432" -w start >/dev/null

createdb -h localhost -p 55432 verification >/dev/null
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "postgresql://localhost:55432/verification" "${BACKUP_FILE}" >/dev/null

psql -h localhost -p 55432 -d verification -c "SELECT 1;" >/dev/null
COUNT=$(psql -h localhost -p 55432 -d verification -At -c "SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema');")
echo "[postgres] Restored database has ${COUNT} user tables" | tee -a "${LOG_DIR}/verify.log"

if [[ "${COUNT}" -eq 0 ]]; then
  echo "[postgres] Verification failed: restored backup contains no user tables" | tee -a "${LOG_DIR}/verify.log"
  exit 4
fi

echo "[postgres] Backup verification succeeded" | tee -a "${LOG_DIR}/verify.log"
