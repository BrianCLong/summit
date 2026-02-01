from summit.automations.runner import automations_enabled, run
from summit.repair.harness import propose_patch, repair_enabled
from summit.scaffold.generate import generate_from_prompt, scaffold_enabled


def test_scaffold_disabled_by_default() -> None:
  assert scaffold_enabled() is False
  assert generate_from_prompt("demo")["status"] == "disabled"


def test_scaffold_enabled(monkeypatch) -> None:
  monkeypatch.setenv("SUMMIT_SCAFFOLD_ENABLE", "1")
  response = generate_from_prompt("demo")
  assert response["status"] == "ok"
  assert response["selected_template"] == "summit-minimal"
  assert response["files"] == ["README.md", "src/main.py", "src/__init__.py"]


def test_repair_disabled_by_default() -> None:
  assert repair_enabled() is False
  assert propose_patch("boom")["status"] == "disabled"


def test_repair_enabled(monkeypatch) -> None:
  monkeypatch.setenv("SUMMIT_REPAIR_ENABLE", "1")
  response = propose_patch("boom")
  assert response["status"] == "proposed"
  assert response["patch"] == ""


def test_automations_disabled_by_default() -> None:
  assert automations_enabled() is False
  assert run("wf-1", {})["status"] == "disabled"


def test_automations_enabled(monkeypatch) -> None:
  monkeypatch.setenv("SUMMIT_AUTOMATIONS_ENABLE", "1")
  response = run("wf-1", {"a": 1, "b": 2})
  assert response["status"] == "queued"
  assert response["payload_keys"] == ["a", "b"]
