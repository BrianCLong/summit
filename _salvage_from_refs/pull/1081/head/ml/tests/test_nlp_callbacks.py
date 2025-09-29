import importlib.util
import pathlib
import sys
import types
from unittest.mock import patch

base_dir = pathlib.Path(__file__).resolve().parents[1]


class _DummyTask:
    pass


class _DummyCelery:
    def task(self, *args, **kwargs):
        def decorator(func):
            def wrapper(*f_args, **f_kwargs):
                return func(_DummyTask(), *f_args, **f_kwargs)

            return wrapper

        return decorator


sys.modules.setdefault("celery", types.SimpleNamespace(Celery=lambda *a, **k: _DummyCelery()))

# Provide minimal monitoring module to satisfy imports
monitoring_module = types.SimpleNamespace(
    track_task_processing=lambda f: f,
    track_error=lambda *a, **k: None,
)
sys.modules.setdefault("ml.app.monitoring", monitoring_module)

# Set up minimal package structure for relative imports
pkg_ml = types.ModuleType("ml")
pkg_ml.__path__ = [str(base_dir)]
pkg_app = types.ModuleType("ml.app")
pkg_app.__path__ = [str(base_dir / "app")]
pkg_tasks_pkg = types.ModuleType("ml.app.tasks")
pkg_tasks_pkg.__path__ = [str(base_dir / "app" / "tasks")]
sys.modules.update({"ml": pkg_ml, "ml.app": pkg_app, "ml.app.tasks": pkg_tasks_pkg})

spec = importlib.util.spec_from_file_location(
    "ml.app.tasks.nlp_tasks", base_dir / "app" / "tasks" / "nlp_tasks.py"
)
nlp_tasks = importlib.util.module_from_spec(spec)
sys.modules["ml.app.tasks.nlp_tasks"] = nlp_tasks
spec.loader.exec_module(nlp_tasks)


SAMPLE_TEXT = "IntelGraph uses Neo4j while Apple builds software"


def test_entity_linking_calls_callback():
    payload = {
        "text": SAMPLE_TEXT,
        "job_id": "job1",
        "callback_url": "http://example.com",
    }
    with patch("ml.app.tasks.nlp_tasks.requests.post") as mock_post:
        result = nlp_tasks.task_entity_linking(payload)
    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert kwargs["json"]["job_id"] == "job1"
    assert result["kind"] == "entity_linking"
    assert len(result["entities"]) >= 1


def test_relationship_extraction_callback():
    entities = [
        {"text": "IntelGraph", "entity_id": "intelgraph-org-id"},
        {"text": "Neo4j", "entity_id": "Q1065908"},
    ]
    payload = {
        "text": SAMPLE_TEXT,
        "entities": entities,
        "job_id": "job2",
        "callback_url": "http://example.com",
    }
    with patch("ml.app.tasks.nlp_tasks.requests.post") as mock_post:
        result = nlp_tasks.task_relationship_extraction(payload)
    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert kwargs["json"]["job_id"] == "job2"
    assert result["kind"] == "relationship_extraction"
    assert isinstance(result["relationships"], list)
