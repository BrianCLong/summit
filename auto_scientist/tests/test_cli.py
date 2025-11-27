# tests/test_cli.py
import pytest
from typer.testing import CliRunner
from pathlib import Path

from auto_scientist.cli import app

runner = CliRunner()

def test_version_callback():
    """Test the --version command."""
    result = runner.invoke(app, ["--version"], catch_exceptions=False)
    assert result.exit_code == 0
    assert "Auto-Scientist version" in result.stdout

def test_init_command(tmp_path: Path):
    """Test the `init` command to ensure it scaffolds a project correctly."""
    project_dir = tmp_path / "new_research"
    result = runner.invoke(app, ["init", str(project_dir)], catch_exceptions=False)

    assert result.exit_code == 0
    assert "Project initialized successfully" in result.stdout

    # Check that key files and directories were created
    assert project_dir.is_dir()
    assert (project_dir / "config.yaml").is_file()
    assert (project_dir / "curriculum.yaml").is_file()
    assert (project_dir / "experiment.py").is_file()
    assert (project_dir / ".gitignore").is_file()
    assert (project_dir / "graph.json").is_file()
    assert (project_dir / "artifacts").is_dir()

# More complex tests for `run`, `graph show`, and `graph viz` would require
# mocking the LLM, filesystem, and subprocesses. These are deferred for brevity
# but would be essential for a production system.
#
# For example, a `test_run_command` would look something like this:
#
# @patch("auto_scientist.cli.LLMPlanner")
# @patch("auto_scientist.cli.ExperimentRunner")
# def test_run_command(MockRunner, MockPlanner, tmp_path: Path):
#     # 1. Initialize a project in tmp_path
#     # 2. Configure mock planner to return a specific proposal
#     # 3. Configure mock runner to return a specific result
#     # 4. Run the `auto-scientist run --path {tmp_path}` command
#     # 5. Assert that the curriculum advanced
#     # 6. Assert that the graph was updated correctly
#     pass
