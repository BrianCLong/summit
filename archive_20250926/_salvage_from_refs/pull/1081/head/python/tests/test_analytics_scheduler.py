import os

import pytest
from fastapi.testclient import TestClient

# Set the DATABASE_URL environment variable for tests
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from intelgraph_py.celery_app import celery_app
from intelgraph_py.database import Base, get_engine, get_session_local
from intelgraph_py.main import app, get_db
from intelgraph_py.models import AlertLog, Schedule, Subscription
from intelgraph_py.tasks import run_ai_analytics_task, send_alerts_to_subscribers

# --- Setup for FastAPI Tests ---

# Use an in-memory SQLite database for testing FastAPI
# SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db" # No longer needed here

# Create a test engine and session local
test_engine = get_engine()
TestingSessionLocal = get_session_local(test_engine)


@pytest.fixture(name="db_session")
def db_session_fixture():
    Base.metadata.create_all(bind=test_engine)  # Create tables using the test engine
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)  # Drop tables after test


@pytest.fixture(name="client")
def client_fixture(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# --- Setup for Celery Tests ---

# pytest-celery automatically provides a function-scoped `celery_app` fixture
# that sets task_always_eager=True and task_eager_propagates=True.
# We just need to ensure our celery_app instance is the one used by pytest-celery.
# No custom fixture needed here.

# Ensure eager execution for all tests
celery_app.conf.task_always_eager = True
celery_app.conf.task_eager_propagates = True

# --- FastAPI Endpoint Tests ---


def test_create_schedule(client: TestClient):
    response = client.post(
        "/schedules/",
        json={
            "graph_id": "test_graph_1",
            "analytics_type": "node_count_drift",
            "cron_schedule": "* * * * *",
            "parameters": {"threshold": 0.1},
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["graph_id"] == "test_graph_1"
    assert "id" in data


def test_read_schedules(client: TestClient, db_session):
    # Create a schedule directly in DB for testing read
    schedule = Schedule(
        graph_id="read_graph", analytics_type="test_type", cron_schedule="* * * * *"
    )
    db_session.add(schedule)
    db_session.commit()

    response = client.get("/schedules/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert any(s["graph_id"] == "read_graph" for s in data)


def test_create_subscription(client: TestClient):
    response = client.post(
        "/subscriptions/",
        json={
            "user_id": "user123",
            "alert_type": "email",
            "contact_info": "user@example.com",
            "filters": {"min_severity": "critical"},
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == "user123"
    assert data["contact_info"] == "user@example.com"


# --- Celery Task Tests ---


def test_debug_task(celery_app):
    result = celery_app.send_task("intelgraph_py.tasks.debug_task", args=("test message",))
    assert result.get() == "Debug Task processed: test message"


def test_run_ai_analytics_task_logs_alert(celery_app, db_session):
    # Create a schedule that will trigger an anomaly for testing
    schedule = Schedule(
        graph_id="graph_with_anomaly",  # This ID triggers the simulated anomaly in tasks.py
        analytics_type="test_anomaly",
        cron_schedule="* * * * *",
        is_active=True,
    )
    db_session.add(schedule)
    db_session.commit()
    db_session.refresh(schedule)

    # Run the task
    run_ai_analytics_task.delay(schedule.id).get()

    # Verify alert was logged
    alert_log = db_session.query(AlertLog).filter_by(schedule_id=schedule.id).first()
    assert alert_log is not None
    assert alert_log.severity == "critical"
    assert "Node count drift" in alert_log.message


def test_send_alerts_to_subscribers(celery_app, db_session):
    # Create a schedule and an alert log
    schedule = Schedule(
        graph_id="alert_graph", analytics_type="test_alert", cron_schedule="* * * * *"
    )
    db_session.add(schedule)
    db_session.commit()
    db_session.refresh(schedule)

    alert_log = AlertLog(
        schedule_id=schedule.id,
        alert_type="test_alert_type",
        severity="critical",
        message="Test alert message",
        details={},
    )
    db_session.add(alert_log)
    db_session.commit()
    db_session.refresh(alert_log)

    # Create subscriptions
    sub_email = Subscription(
        user_id="user_email", alert_type="email", contact_info="email@example.com", is_active=True
    )
    sub_websocket = Subscription(
        user_id="user_ws", alert_type="websocket", contact_info="ws_id_123", is_active=True
    )
    db_session.add_all([sub_email, sub_websocket])
    db_session.commit()

    # Run the task
    send_alerts_to_subscribers.delay(schedule.graph_id, alert_log.id).get()

    # Verify alert was marked as sent
    updated_alert_log = db_session.query(AlertLog).filter_by(id=alert_log.id).first()
    assert updated_alert_log.is_sent == True

    # Further assertions would involve mocking email/websocket sending functions
    # to ensure they were called with correct arguments.
