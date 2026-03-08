#!/usr/bin/env bash
set -e

# Initialize pg_partman extension
# This should be run after the database is up

DB_NAME=${POSTGRES_DB:-maestro}
DB_USER=${POSTGRES_USER:-maestro}

echo "Initializing pg_partman for database ${DB_NAME}..."

psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" <<-EOSQL
    CREATE SCHEMA IF NOT EXISTS partman;
    CREATE EXTENSION IF NOT EXISTS pg_partman SCHEMA partman;
    -- Note: Grants might need superuser, but we try anyway
    GRANT ALL ON SCHEMA partman TO "$DB_USER";
EOSQL

echo "pg_partman initialized."
