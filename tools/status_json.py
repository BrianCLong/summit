#!/usr/bin/env python3
import json, os, socket, subprocess, time
from datetime import datetime, timezone

def port_up(port):
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=0.4):
            return True
    except Exception:
        return False

def duck_counts(db="rag/index/rag.duckdb"):
    try:
        import duckdb  # free, already in your stack
        if not os.path.exists(db): return {"rows": 0, "files": 0}
        con = duckdb.connect(db)
        rows = con.execute("select count(*) from docs").fetchone()[0]
        files = con.execute("select count(distinct path) from docs").fetchone()[0]
        return {"rows": int(rows), "files": int(files)}
    except Exception:
        return {"rows": None, "files": None}

def neo4j_running():
    try:
        out = subprocess.check_output(
            ["docker","ps","--filter","name=neo4j-ephemeral","--format","{{.Status}}"],
            text=True
        ).strip()
        return bool(out)
    except Exception:
        return False

def model_counts():
    try:
        import requests
        resp = requests.get("http://127.0.0.1:4000/v1/models", timeout=2)
        if resp.status_code == 200:
            models = resp.json().get("data", [])
            return {"count": len(models), "models": [m.get("id") for m in models]}
    except Exception:
        pass
    return {"count": None, "models": []}

status = {
    "time": datetime.now(timezone.utc).isoformat(),
    "services": {
        "ollama": port_up(11434),
        "litellm": port_up(4000),
        "neo4j_ephemeral": neo4j_running()
    },
    "rag": duck_counts(),
    "models": model_counts(),
    "environment": {
        "profile": os.getenv("PROFILE", "dev"),
        "autonomy": int(os.getenv("AUTONOMY", "1")),
        "rag_topk": int(os.getenv("RAG_TOPK", "5"))
    }
}

os.makedirs("dashboard", exist_ok=True)
with open("dashboard/status.json","w") as f:
    json.dump(status, f, indent=2)
print("Wrote dashboard/status.json")