set -euo pipefail
PORT=${1:-55432}
docker rm -f prdb 2>/dev/null || true
docker run -d --name prdb -e POSTGRES_PASSWORD=pg -p $PORT:5432 postgres:15
echo "⏳ restoring base backup"
docker exec prdb bash -lc 'apt-get update && apt-get install -y curl ca-certificates'
docker exec prdb bash -lc 'curl -sL https://github.com/wal-g/wal-g/releases/download/v3.0.1/wal-g-linux-amd64.tar.gz | tar -xz -C /usr/local/bin'
docker exec prdb bash -lc 'mkdir -p /var/lib/postgresql/data && wal-g backup-fetch /var/lib/postgresql/data LATEST'
docker exec prdb bash -lc 'chown -R postgres:postgres /var/lib/postgresql/data'
docker restart prdb
echo "🔒 applying privacy redactions & seeds"
PGPASSWORD=pg psql -h localhost -p $PORT -U postgres -d app -f server/db/redactions.sql
PGPASSWORD=pg psql -h localhost -p $PORT -U postgres -d app -f server/db/seeds_minimal.sql
echo "✅ clone ready on port $PORT"