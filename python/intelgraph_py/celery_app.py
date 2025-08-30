import os

from celery import Celery

# Configure Celery
# Redis as broker and backend
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery_app = Celery(
    "intelgraph_tasks",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=["intelgraph_py.tasks"],  # We will define tasks in intelgraph_py/tasks.py
)

# Optional: Configure Celery Beat for periodic tasks
# We will manage schedules via FastAPI and a database, so this is minimal for now.
celery_app.conf.beat_schedule = {
    "run-test-task-every-30-seconds": {
        "task": "intelgraph_py.tasks.debug_task",
        "schedule": 30.0,
        "args": ("Hello from Celery Beat!",),
    },
}
celery_app.conf.timezone = "UTC"


# Basic test task (will be moved to intelgraph_py/tasks.py later)
@celery_app.task(bind=True)
def debug_task(self, message):
    print(f"Request: {self.request.id} - Debug Task received: {message}")
    return f"Debug Task processed: {message}"


if __name__ == "__main__":
    celery_app.start()
