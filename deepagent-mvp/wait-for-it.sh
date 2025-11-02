#!/bin/sh
# wait-for-it.sh

set -e

postgres_host="$1"
neo4j_host="$2"
tool_server_host="$3"
shift 3
cmd="$@"

until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$postgres_host" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

until curl -s "http://$neo4j_host:7474" > /dev/null; do
  >&2 echo "Neo4j is unavailable - sleeping"
  sleep 1
done

until curl -s "http://$tool_server_host:3000" > /dev/null; do
  >&2 echo "Tool server is unavailable - sleeping"
  sleep 1
done

>&2 echo "All services are up - executing command"
exec $cmd
