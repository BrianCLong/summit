#!/bin/bash
set -e

host="$1"
user="$2"
db="$3"
password="$4"

echo "Waiting for postgres at $host..."

until PGPASSWORD=$password psql -h "$host" -U "$user" -d "$db" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - executing command"
