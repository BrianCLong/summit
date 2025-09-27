import os
import importlib
import sys
from pathlib import Path
from fastapi.testclient import TestClient

root = Path(__file__).resolve().parents[1]
db_file = root / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{db_file}"

sys.path.append(str(root))

# Reload modules to pick up new DB URL
from intelgraph_py import db as db_module
importlib.reload(db_module)
db_module.init_db()

from intelgraph_py import tasks as task_module
importlib.reload(task_module)

from apps.api.main import app


def test_task_flow(monkeypatch):
  client = TestClient(app)

  res = client.post("/schedules", json={"graph_id": "g1", "interval": 60, "thresholds": {"node_drift": 0.2}})
  sched_id = res.json()["id"]
  client.post("/subscriptions", json={"graph_id": "g1", "contact": "user@example.com"})

  session = db_module.SessionLocal()
  sched = session.get(db_module.Schedule, sched_id)
  sched.last_run_metrics = {"nodes": 100, "edges": 200, "clusters": 3, "metric_score": 0.5}
  session.commit()
  session.close()

  def fake_metrics(graph_id: str):
    return {"nodes": 130, "edges": 200, "clusters": 3, "metric_score": 0.5}

  monkeypatch.setattr(task_module, "fetch_graph_metrics", fake_metrics)
  task_module.celery_app.conf.task_always_eager = True
  task_module.run_analytics.delay(sched_id)

  session = db_module.SessionLocal()
  assert session.query(db_module.AlertLog).count() == 1
  session.close()
  assert task_module.ALERT_OUTBOX[0][0] == "user@example.com"
