from google.cloud import resourcemanager_v3
import json, os, sqlite3, datetime
DB_PATH=os.getenv("DB_PATH","./data/inventory.db")

def run():
    client = resourcemanager_v3.ProjectsClient()
    rows=[]
    for p in client.list_projects():
        raw = resourcemanager_v3.Project.to_dict(p)
        rows.append((p.name.split('/')[-1], 'gcp', p.display_name, p.parent, p.state.name, json.dumps(raw), json.dumps({"source":"gcp-sdk","ts":datetime.datetime.utcnow().isoformat()})))
    with sqlite3.connect(DB_PATH) as c:
        c.executemany("insert into inventory_cloud_accounts (id,provider,name,org_path,status,raw,provenance) values (?,?,?,?,?,?,?) on conflict(id) do update set name=excluded.name, status=excluded.status, raw=excluded.raw", rows)

if __name__ == "__main__":
    run()
