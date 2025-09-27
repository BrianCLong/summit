from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from intelgraph_py.database import get_db, get_engine, get_session_local, Base, create_db_tables
from intelgraph_py.models import Schedule, Subscription, AlertLog
from intelgraph_py.schemas import (
    ScheduleCreate, ScheduleUpdate, ScheduleInDB,
    SubscriptionCreate, SubscriptionUpdate, SubscriptionInDB,
    AlertLogInDB
)
from intelgraph_py.celery_app import celery_app
from intelgraph_py.tasks import run_ai_analytics_task # Import the task
from strawberry.fastapi import GraphQLRouter
from intelgraph_py.graphql_schema import schema

# Initialize engine and SessionLocal for the main app
engine = get_engine()
SessionLocal = get_session_local(engine)

app = FastAPI(
    title="IntelGraph Analytics Scheduler API",
    description="API for managing scheduled AI analytics tasks and user alerts.",
    version="0.1.0",
)

graphql_app = GraphQLRouter(schema)
app.include_router(graphql_app, prefix="/graphql")

@app.on_event("startup")
async def startup_event():
    create_db_tables() # Create tables on startup


# --- Schedule Management Endpoints ---

@app.post("/schedules/", response_model=ScheduleInDB, status_code=status.HTTP_201_CREATED)
def create_schedule(schedule: ScheduleCreate, db: Session = Depends(get_db)):
    db_schedule = Schedule(**schedule.dict())
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)

    # Dispatch Celery task to add/update schedule in Celery Beat
    # In a real scenario, you'd use a Celery Beat scheduler that reads from DB
    # For now, we'll just enqueue the task directly for immediate execution or manual scheduling
    # For periodic tasks, you'd typically use django-celery-beat or a custom beat scheduler
    # that reads from the DB and adds entries to celery_app.conf.beat_schedule dynamically.
    # For this example, we'll just enqueue the task to run once for demonstration.
    # To truly schedule it periodically, you'd need a Celery Beat instance running
    # and a mechanism to update its schedule based on DB changes.
    # For now, we'll just enqueue it to run once.
    run_ai_analytics_task.delay(db_schedule.id)

    return db_schedule

@app.get("/schedules/", response_model=List[ScheduleInDB])
def read_schedules(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    schedules = db.query(Schedule).offset(skip).limit(limit).all()
    return schedules

@app.get("/schedules/{schedule_id}", response_model=ScheduleInDB)
def read_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule

@app.put("/schedules/{schedule_id}", response_model=ScheduleInDB)
def update_schedule(schedule_id: int, schedule: ScheduleUpdate, db: Session = Depends(get_db)):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if db_schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")

    for key, value in schedule.dict(exclude_unset=True).items():
        setattr(db_schedule, key, value)
    
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)

    # Re-dispatch task if schedule changed (for dynamic Celery Beat integration)
    run_ai_analytics_task.delay(db_schedule.id) # For demonstration

    return db_schedule

@app.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if db_schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(db_schedule)
    db.commit()
    return {"ok": True}

# --- Subscription Management Endpoints ---

@app.post("/subscriptions/", response_model=SubscriptionInDB, status_code=status.HTTP_201_CREATED)
def create_subscription(subscription: SubscriptionCreate, db: Session = Depends(get_db)):
    db_subscription = Subscription(**subscription.dict())
    db.add(db_subscription)
    db.commit()
    db.refresh(db_subscription)
    return db_subscription

@app.get("/subscriptions/", response_model=List[SubscriptionInDB])
def read_subscriptions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    subscriptions = db.query(Subscription).offset(skip).limit(limit).all()
    return subscriptions

@app.get("/subscriptions/{subscription_id}", response_model=SubscriptionInDB)
def read_subscription(subscription_id: int, db: Session = Depends(get_db)):
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if subscription is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return subscription

@app.put("/subscriptions/{subscription_id}", response_model=SubscriptionInDB)
def update_subscription(subscription_id: int, subscription: SubscriptionUpdate, db: Session = Depends(get_db)):
    db_subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if db_subscription is None:
        raise HTTPException(status_code=404, detail="Subscription not found")

    for key, value in subscription.dict(exclude_unset=True).items():
        setattr(db_subscription, key, value)
    
    db.add(db_subscription)
    db.commit()
    db.refresh(db_subscription)
    return db_subscription

@app.delete("/subscriptions/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subscription(subscription_id: int, db: Session = Depends(get_db)):
    db_subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if db_subscription is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    db.delete(db_subscription)
    db.commit()
    return {"ok": True}

# --- Alert Log Endpoints ---

@app.get("/alerts/", response_model=List[AlertLogInDB])
def read_alerts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    alerts = db.query(AlertLog).offset(skip).limit(limit).all()
    return alerts

@app.get("/alerts/{alert_id}", response_model=AlertLogInDB)
def read_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(AlertLog).filter(AlertLog.id == alert_id).first()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

# --- Celery Task Status (Optional) ---

@app.get("/tasks/{task_id}")
def get_task_status(task_id: str):
    task_result = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": task_result.status,
        "result": task_result.result
    }
