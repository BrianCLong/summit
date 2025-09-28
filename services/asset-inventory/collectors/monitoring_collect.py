import requests, os, sqlite3, json, datetime
DB_PATH=os.getenv("DB_PATH","./data/inventory.db")
PROM_URL=os.getenv("PROM_URL")
GRAFANA_URL=os.getenv("GRAFANA_URL")
GRAFANA_TOKEN=os.getenv("GRAFANA_TOKEN")

def run():
    rows=[]
    if PROM_URL:
        try:
            r=requests.get(f"{PROM_URL}/api/v1/status/runtimeinfo", timeout=5)
            rows.append(("prom-default","prometheus",PROM_URL,"token" if 'Authorization' in r.request.headers else 'none',"up" if r.ok else "down", json.dumps(r.json() if r.ok else {}), json.dumps({"source":"prom","ts":datetime.datetime.utcnow().isoformat()})))
        except Exception:
            rows.append(("prom-default","prometheus",PROM_URL,"none","down", "{}", json.dumps({"source":"prom","error":True})))
    if GRAFANA_URL:
        headers={}
        if GRAFANA_TOKEN:
            headers={"Authorization":f"Bearer {GRAFANA_TOKEN}"}
        r=requests.get(f"{GRAFANA_URL}/api/health", headers=headers, timeout=5)
        rows.append(("grafana-default","grafana",GRAFANA_URL,"token" if GRAFANA_TOKEN else 'none',"up" if r.ok else "down", json.dumps(r.json() if r.ok else {}), json.dumps({"source":"grafana","ts":datetime.datetime.utcnow().isoformat()})))
    with sqlite3.connect(DB_PATH) as c:
        c.executemany("insert into inventory_monitoring_endpoints (id,kind,url,auth_mode,status,raw,provenance) values (?,?,?,?,?,?,?) on conflict(id) do update set url=excluded.url, status=excluded.status, raw=excluded.raw", rows)

if __name__ == "__main__":
    run()
