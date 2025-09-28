set -euo pipefail
DB_PATH=${DB_PATH:-./data/inventory.db}
mkdir -p $(dirname "$DB_PATH")
python - <<'PY'
import sqlite3, os
schema='''
create table if not exists inventory_cloud_accounts (
  id text primary key, provider text, name text, org_path text, status text, raw json, provenance json
);
create table if not exists inventory_monitoring_endpoints (
  id text primary key, kind text, url text, auth_mode text, status text, raw json, provenance json
);
'''
os.makedirs('./data', exist_ok=True)
con=sqlite3.connect(os.getenv('DB_PATH','./data/inventory.db'))
con.executescript(schema)
con.commit(); con.close()
PY
