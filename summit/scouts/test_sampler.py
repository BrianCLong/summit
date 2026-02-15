import ast
import os
import time
from typing import Any, List, Set

from .base import Config, Result, Scout


def is_safe_test_file(path: str) -> bool:
    """
    Determines if a test file is safe to run.
    Checks for unsafe markers and directory names.
    """
    unsafe_dirs = {'integration', 'e2e', 'performance', 'system', 'benchmark'}
    parts = path.split(os.sep)
    if any(part in unsafe_dirs for part in parts):
        return False

    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        tree = ast.parse(content, filename=path)
    except Exception:
        # If we can't parse it, assume it's unsafe or just skip it.
        return False

    unsafe_markers = {'e2e', 'integration', 'slow', 'benchmark', 'network'}

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            for decorator in node.decorator_list:

                # Check for @marker
                if isinstance(decorator, ast.Name):
                    if decorator.id in unsafe_markers:
                        return False

                # Check for @module.marker
                elif isinstance(decorator, ast.Attribute):
                    # Check if it looks like pytest.mark.something
                    if isinstance(decorator.value, ast.Attribute) and decorator.value.attr == 'mark':
                        if decorator.attr in unsafe_markers:
                            return False
                    # Or just check the attribute name if we are loose (e.g. @slow)
                    elif decorator.attr in unsafe_markers:
                        return False

                # Check for @marker() or @module.marker()
                elif isinstance(decorator, ast.Call):
                    if isinstance(decorator.func, ast.Name):
                         if decorator.func.id in unsafe_markers:
                             return False
                    elif isinstance(decorator.func, ast.Attribute):
                        # Check if it looks like pytest.mark.something()
                        if isinstance(decorator.func.value, ast.Attribute) and decorator.func.value.attr == 'mark':
                            if decorator.func.attr in unsafe_markers:
                                return False
                        # Or just check the attribute name (e.g. @slow())
                        elif decorator.func.attr in unsafe_markers:
                            return False

    return True


def find_test_files(root_dir: str, max_cost_ms: int) -> List[str]:
    """
    Finds safe test files in the given directory tree.
    Respects the time limit.
    """
    start_time = time.time()
    safe_tests = []

    for root, dirs, files in os.walk(root_dir):
        # Exclude hidden directories and node_modules
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'node_modules']

        for file in files:
            if (time.time() - start_time) * 1000 > max_cost_ms:
                return safe_tests

            if file.startswith("test_") or file.endswith("_test.py"):
                full_path = os.path.join(root, file)
                if is_safe_test_file(full_path):
                    safe_tests.append(full_path)

    return safe_tests


class TestSamplerScout(Scout):
    def name(self) -> str:
        return "test_sampler"

    def _run(self, ctx: Any, cfg: Config) -> Result:
        # Attempt to get root directory from context, default to current working directory
        root_dir = "."
        if hasattr(ctx, "path"):
            root_dir = ctx.path
        elif isinstance(ctx, dict) and "path" in ctx:
            root_dir = ctx["path"]

        if not os.path.exists(root_dir):
            root_dir = "."

        start_time = time.time()
        artifacts = find_test_files(root_dir, cfg.max_cost_ms)
        cost_ms = int((time.time() - start_time) * 1000)

        return Result(artifacts=artifacts, cost_ms=cost_ms)
