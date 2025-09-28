from azure.identity import DefaultAzureCredential
from azure.mgmt.resource import SubscriptionClient
import os, sqlite3, json, datetime
DB_PATH=os.getenv("DB_PATH","./data/inventory.db")

def run():
    cred=DefaultAzureCredential()
    client=SubscriptionClient(cred)
    rows=[]
    for s in client.subscriptions.list():
        raw = {"subscription_id": s.subscription_id, "display_name": s.display_name, "state": s.state.value}
        rows.append((s.subscription_id, 'azure', s.display_name, None, s.state.value, json.dumps(raw), json.dumps({"source":"azure-sdk","ts":datetime.datetime.utcnow().isoformat()})))
    with sqlite3.connect(DB_PATH) as c:
        c.executemany("insert into inventory_cloud_accounts (id,provider,name,org_path,status,raw,provenance) values (?,?,?,?,?,?,?) on conflict(id) do update set name=excluded.name, status=excluded.status, raw=excluded.raw", rows)

if __name__ == "__main__":
    run()
