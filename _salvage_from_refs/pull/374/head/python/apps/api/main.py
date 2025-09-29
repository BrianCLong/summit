from fastapi import FastAPI, Depends
from pydantic import BaseModel
from intelgraph_py.db import SessionLocal, Schedule, Subscription, init_db

app = FastAPI()


def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()


class ScheduleCreate(BaseModel):
  graph_id: str
  interval: int
  thresholds: dict = {}


@app.post("/schedules")
def create_schedule(data: ScheduleCreate, db = Depends(get_db)):
  sched = Schedule(graph_id=data.graph_id, interval=data.interval, thresholds=data.thresholds)
  db.add(sched)
  db.commit()
  db.refresh(sched)
  return {"id": sched.id}


class SubscriptionCreate(BaseModel):
  graph_id: str
  contact: str


@app.post("/subscriptions")
def create_subscription(data: SubscriptionCreate, db = Depends(get_db)):
  sub = Subscription(graph_id=data.graph_id, contact=data.contact)
  db.add(sub)
  db.commit()
  db.refresh(sub)
  return {"id": sub.id}


init_db()
