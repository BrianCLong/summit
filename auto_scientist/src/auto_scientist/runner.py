# src/auto_scientist/runner.py
from __future__ import annotations
import subprocess
import sys
import importlib
import pickle
import traceback
from pathlib import Path
from uuid import UUID
from typing import Callable, Any, Dict
from datetime import datetime, timezone

from pydantic import BaseModel, Field, ConfigDict, field_serializer

from .schemas import Node, NodeType
from .storage import StorageBackend
from .graph import ExperimentGraph

class RunnerError(Exception):
    """Base exception for runner errors."""

class RunRecord(BaseModel):
    """A detailed record of a single experiment execution."""
    model_config = ConfigDict(arbitrary_types_allowed=True)

    success: bool
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    result: Dict[str, Any] | None = None
    stdout: str = ""
    stderr: str = ""
    exception: str | None = None
    git_commit_hash: str | None = None
    python_dependencies: list[str] | None = None

    @field_serializer('start_time', 'end_time')
    def serialize_dt(self, dt: datetime, _info) -> str:
        return dt.isoformat()

def _get_git_commit() -> str | None:
    try:
        return subprocess.check_output(['git', 'rev-parse', 'HEAD']).strip().decode('utf-8')
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None

def _get_pip_freeze() -> list[str]:
    try:
        return subprocess.check_output([sys.executable, '-m', 'pip', 'freeze']).strip().decode('utf-8').splitlines()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return []

def _execute_in_subprocess(train_fn_path: str, config: dict, output_path: Path):
    """Wrapper to run the train_fn in a clean subprocess."""
    module_path, fn_name = train_fn_path.split(":")

    start_time = datetime.now(timezone.utc)
    stdout, stderr, exc_str, result = "", "", None, None
    success = False

    try:
        module = importlib.import_module(module_path)
        train_fn = getattr(module, fn_name)
        result = train_fn(config)
        success = True
    except Exception:
        exc_str = traceback.format_exc()
        stderr = exc_str

    end_time = datetime.now(timezone.utc)

    record = RunRecord(
        success=success,
        start_time=start_time,
        end_time=end_time,
        duration_seconds=(end_time - start_time).total_seconds(),
        result=result,
        stdout=stdout,
        stderr=stderr,
        exception=exc_str,
        git_commit_hash=_get_git_commit(),
        python_dependencies=_get_pip_freeze(),
    )

    with output_path.open("wb") as f:
        pickle.dump(record, f)

class ExperimentRunner:
    """
    Manages the execution of experiments in isolated subprocesses for reproducibility.
    """
    def __init__(self, train_fn_path: str, storage: StorageBackend):
        self.train_fn_path = train_fn_path
        self._storage = storage

    def run_experiment(self, graph: ExperimentGraph, config: dict, stage: str, depends_on: list[UUID]) -> Node:
        """
        Executes an experiment, captures its results, and adds a new EVAL node to the graph.
        """
        temp_output = self._storage.project_path / f"run_result_{UUID_V4()}.pkl"

        # We need to run a separate python process to ensure isolation
        cmd = [
            sys.executable,
            "-c",
            f"from auto_scientist.runner import _execute_in_subprocess; _execute_in_subprocess('{self.train_fn_path}', {config}, '{temp_output}')"
        ]

        proc = subprocess.run(cmd, capture_output=True, text=True)

        if not temp_output.exists():
            raise RunnerError(f"Subprocess failed to produce a result file.\nStdout:\n{proc.stdout}\nStderr:\n{proc.stderr}")

        with temp_output.open("rb") as f:
            run_record = pickle.load(f)

        temp_output.unlink() # Clean up

        # Create a new EVAL node
        eval_node = Node(
            type=NodeType.EVAL,
            payload={
                "config": config,
                "run_record": run_record.model_dump(mode="json"),
                "metrics": run_record.result.get("metrics", {}) if run_record.result else {}
            },
            stage=stage,
        )
        graph.add_node(eval_node)

        # Link to dependencies
        for dep_id in depends_on:
            graph.add_edge(dep_id, eval_node.id, EdgeType.DEPENDS_ON)

        print(f"  -> Runner: Experiment {'succeeded' if run_record.success else 'failed'}. "
              f"Duration: {run_record.duration_seconds:.2f}s. "
              f"New EVAL node: {eval_node.id}")

        return eval_node
