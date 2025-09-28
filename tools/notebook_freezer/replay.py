"""Replay logic for RNF bundles."""

from __future__ import annotations

import ast
import io
import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

from .utils import dumps_json, read_json, sha256_bytes, utcnow, write_json


@dataclass
class ReplayResult:
    index: int
    expected_sha: str
    actual_sha: str
    match: bool
    difference: Optional[str]


class NotebookReplayer:
    def __init__(self, bundle_path: Path) -> None:
        self.bundle_path = bundle_path
        self.manifest = read_json(bundle_path / "manifest.json")

    def run(self, output_dir: Optional[Path] = None) -> Path:
        self._validate_environment()
        replay_dir = output_dir or (self.bundle_path / "replays" / utcnow().replace(":", "-"))
        artifacts_dir = replay_dir / "artifacts"
        artifacts_dir.mkdir(parents=True, exist_ok=True)
        source_path = self.bundle_path / self.manifest["notebook"]["path"]
        notebook = json.loads(source_path.read_text(encoding="utf-8"))
        results: List[ReplayResult] = []
        for cell_meta in self.manifest.get("cells", []):
            index = cell_meta["index"]
            expected_path = self.bundle_path / cell_meta["artifact"]["path"]
            expected_payload = read_json(expected_path)
            actual_payload = self._execute_cell(notebook["cells"][index], index)
            actual_path = artifacts_dir / expected_path.name
            actual_path.write_text(dumps_json(actual_payload) + "\n", encoding="utf-8")
            expected_sha = cell_meta["artifact"]["sha256"]
            actual_sha = sha256_bytes(dumps_json(actual_payload).encode("utf-8"))
            difference = None
            if expected_sha != actual_sha:
                difference = self._build_diff(expected_payload, actual_payload)
            results.append(ReplayResult(index, expected_sha, actual_sha, expected_sha == actual_sha, difference))
        report = {
            "bundle": str(self.bundle_path),
            "run_at": utcnow(),
            "results": [result.__dict__ for result in results],
            "success": all(result.match for result in results),
        }
        write_json(replay_dir / "report.json", report)
        if not report["success"]:
            raise RuntimeError("Replay detected nondeterministic outputs")
        return replay_dir

    # ------------------------------------------------------------------
    def _validate_environment(self) -> None:
        env = self.manifest.get("environment", {})
        expected = env.get("sha256")
        if not expected:
            return
        result = subprocess.run(
            [sys.executable, "-m", "pip", "freeze"],
            check=True,
            capture_output=True,
            text=True,
        )
        actual = sha256_bytes(result.stdout.strip().encode("utf-8"))
        if actual != expected:
            raise RuntimeError(
                "Environment hash mismatch. Expected "
                f"{expected}, observed {actual}. Install the pinned requirements"
            )

    def _execute_cell(self, cell: Dict[str, Any], index: int) -> Dict[str, Any]:
        if cell.get("cell_type") != "code":
            return {"index": index, "outputs": []}
        code = "".join(cell.get("source", []))
        module = ast.parse(code, mode="exec")
        body = module.body
        last_expr = None
        if body and isinstance(body[-1], ast.Expr):
            last_expr = ast.Expression(body[-1].value)
            body = body[:-1]
        exec_code = ast.Module(body=body, type_ignores=[])
        globals_ns: Dict[str, Any] = {"__name__": "__main__"}
        stdout = io.StringIO()
        stderr = io.StringIO()
        outputs: List[Dict[str, Any]] = []

        def display(*objects: Any) -> None:
            for obj in objects:
                outputs.append(
                    {
                        "type": "display_data",
                        "data": {"text/plain": repr(obj)},
                    }
                )

        globals_ns["display"] = display
        exec_bytes = compile(exec_code, filename="<cell>", mode="exec") if body else None
        expr_bytes = compile(last_expr, filename="<cell>", mode="eval") if last_expr else None
        with redirect(stdout=stdout, stderr=stderr):
            if exec_bytes is not None:
                exec(exec_bytes, globals_ns)
            result = None
            if expr_bytes is not None:
                result = eval(expr_bytes, globals_ns)
        stdout_text = stdout.getvalue()
        stderr_text = stderr.getvalue()
        if stdout_text:
            outputs.append({"type": "stream", "name": "stdout", "text": stdout_text})
        if stderr_text:
            outputs.append({"type": "stream", "name": "stderr", "text": stderr_text})
        if expr_bytes is not None and result is not None:
            outputs.append({"type": "execute_result", "data": {"text/plain": repr(result)}})
        payload = {
            "index": index,
            "id": cell.get("id"),
            "execution_count": cell.get("execution_count"),
            "outputs": outputs,
        }
        return payload

    def _build_diff(self, expected: Dict[str, Any], actual: Dict[str, Any]) -> str:
        return json.dumps({"expected": expected, "actual": actual}, indent=2, ensure_ascii=False)


class redirect:
    """Context manager capturing stdout/stderr without importing contextlib."""

    def __init__(self, stdout: io.StringIO, stderr: io.StringIO) -> None:
        self.stdout = stdout
        self.stderr = stderr
        self._prev_stdout = None
        self._prev_stderr = None

    def __enter__(self) -> "redirect":
        self._prev_stdout = sys.stdout
        self._prev_stderr = sys.stderr
        sys.stdout = self.stdout
        sys.stderr = self.stderr
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # type: ignore[override]
        sys.stdout = self._prev_stdout  # type: ignore[assignment]
        sys.stderr = self._prev_stderr  # type: ignore[assignment]

