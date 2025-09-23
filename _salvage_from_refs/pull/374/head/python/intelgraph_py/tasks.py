import os
from celery import Celery
from typing import Dict
from .db import SessionLocal, Schedule, Subscription, AlertLog
from .detection import detect_changes

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery("intelgraph", broker=REDIS_URL, backend=REDIS_URL)
celery_app.conf.task_default_queue = "intelgraph"

ALERT_OUTBOX: list[tuple[str, Dict]] = []

def fetch_graph_metrics(graph_id: str) -> Dict:
  # Placeholder analytics; real implementation would query graph DB
  return {"nodes": 0, "edges": 0, "clusters": 0, "metric_score": 0.0}

def notify_subscribers(graph_id: str, detail: Dict):
  session = SessionLocal()
  try:
    subs = session.query(Subscription).filter_by(graph_id=graph_id).all()
    for sub in subs:
      ALERT_OUTBOX.append((sub.contact, detail))
  finally:
    session.close()

@celery_app.task
def run_analytics(schedule_id: int):
  session = SessionLocal()
  try:
    sched = session.get(Schedule, schedule_id)
    if not sched:
      return
    metrics = fetch_graph_metrics(sched.graph_id)
    changes = detect_changes(sched.last_run_metrics, metrics, sched.thresholds or {})
    if changes:
      log = AlertLog(graph_id=sched.graph_id, detail=changes)
      session.add(log)
      session.commit()
      notify_subscribers(sched.graph_id, changes)
    sched.last_run_metrics = metrics
    session.commit()
  finally:
    session.close()
