from intelgraph_py.celery_app import celery_app
from intelgraph_py.database import get_db
from intelgraph_py.models import Schedule, AlertLog, Subscription
from sqlalchemy.orm import Session
from datetime import datetime
import time
import json

# Move debug_task here
@celery_app.task(bind=True)
def debug_task(self, message):
    print(f"Request: {self.request.id} - Debug Task received: {message}")
    return f"Debug Task processed: {message}"

@celery_app.task(bind=True)
def run_ai_analytics_task(self, schedule_id: int):
    db: Session = next(get_db())
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()

    if not schedule or not schedule.is_active:
        print(f"Schedule {schedule_id} not found or not active. Skipping.")
        return

    print(f"Running AI analytics for graph_id: {schedule.graph_id}, analytics_type: {schedule.analytics_type}")

    # --- Placeholder for AI Analytics Logic ---
    # 1. Fetch graph data based on schedule.graph_id
    #    (e.g., from Neo4j, a file, or another service)
    # current_graph_data = fetch_graph_data(schedule.graph_id)

    # 2. Run AI analytics
    #    (e.g., result = run_analytics_model(current_graph_data, schedule.analytics_type, schedule.parameters))
    # For now, simulate some work
    time.sleep(5) 
    
    # 3. Implement Change Detection Logic
    #    (e.g., compare current_graph_data with previous state, or analyze analytics results)
    #    This is where node/edge count drift, cluster shifts, metric thresholds would be checked.
    #    For demonstration, let's simulate a change detection
    change_detected = False
    anomaly_details = {}
    severity = "info"
    alert_message = "No significant changes detected."

    if schedule.graph_id == "graph_with_anomaly" and datetime.now().minute % 2 == 0:
        change_detected = True
        anomaly_details = {"node_count_drift": {"old": 100, "new": 120, "delta": 20}}
        severity = "critical"
        alert_message = f"Critical: Node count drift detected for graph {schedule.graph_id}!"

    # 4. Log Alert if change detected
    if change_detected:
        alert_log = AlertLog(
            schedule_id=schedule.id,
            alert_type="node_count_drift" if "node_count_drift" in anomaly_details else "generic_anomaly",
            severity=severity,
            message=alert_message,
            details=anomaly_details
        )
        db.add(alert_log)
        db.commit()
        db.refresh(alert_log)
        print(f"Alert logged: {alert_message}")

        # 5. Send Alerts to Subscribed Users
        send_alerts_to_subscribers.delay(schedule.graph_id, alert_log.id)

    # Update schedule's last_run_at
    schedule.last_run_at = datetime.now()
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    db.close()

@celery_app.task(bind=True)
def send_alerts_to_subscribers(self, graph_id: str, alert_log_id: int):
    db: Session = next(get_db())
    alert_log = db.query(AlertLog).filter(AlertLog.id == alert_log_id).first()
    subscriptions = db.query(Subscription).filter(Subscription.is_active == True).all()

    if not alert_log:
        print(f"Alert log {alert_log_id} not found. Cannot send alerts.")
        return

    print(f"Sending alerts for graph {graph_id}, alert ID {alert_log_id} (Severity: {alert_log.severity})")

    for sub in subscriptions:
        # Apply filters if any
        if sub.filters:
            # Simple filter example: only send if alert severity matches filter
            if sub.filters.get("min_severity") and \
               (sub.filters["min_severity"] == "critical" and alert_log.severity != "critical"):
                continue # Skip if severity doesn't match filter

        if sub.alert_type == "email":
            print(f"Simulating email to {sub.contact_info}: {alert_log.message}")
            # send_email(sub.contact_info, "IntelGraph Alert", alert_log.message, alert_log.details)
        elif sub.alert_type == "websocket":
            print(f"Simulating WebSocket message to {sub.contact_info}: {alert_log.message}")
            # send_websocket_message(sub.contact_info, alert_log.message, alert_log.details)
        else:
            print(f"Unknown alert type: {sub.alert_type} for subscription {sub.id}")

    alert_log.is_sent = True
    db.add(alert_log)
    db.commit()
    db.close()
