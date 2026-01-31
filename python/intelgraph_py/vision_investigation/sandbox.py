import ast
import logging
import math
from typing import Any

from . import tools

logger = logging.getLogger(__name__)

class SecurityVisitor(ast.NodeVisitor):
    def __init__(self):
        self.errors = []

    def visit_Import(self, node):
        self.errors.append(f"Import disallowed at line {node.lineno}")

    def visit_ImportFrom(self, node):
        self.errors.append(f"ImportFrom disallowed at line {node.lineno}")

    def visit_Attribute(self, node):
        # Allow basic attributes, but maybe block dunder
        if node.attr.startswith("__"):
             self.errors.append(f"Dunder attribute access disallowed at line {node.lineno}")
        self.generic_visit(node)

    def visit_Call(self, node):
        # Could enforce only calling whitelisted functions here,
        # but execution environment handles that by only providing those functions.
        if isinstance(node.func, ast.Name):
             if node.func.id.startswith("__"):
                 self.errors.append(f"Dunder function call disallowed at line {node.lineno}")
        self.generic_visit(node)

class SafeExecutor:
    """
    Executes Python code in a restricted environment using AST validation.
    """
    def __init__(self):
        self.allowed_globals = {
            "math": math,
            "crop_image": tools.crop_image,
            "rotate_image": tools.rotate_image,
            "annotate_image": tools.annotate_image,
            "measure_distance": tools.measure_distance,
            "count_connected_components": tools.count_connected_components,
            "print": self._safe_print,
        }

    def _safe_print(self, *args):
        logger.info("Sandbox Output: %s", " ".join(map(str, args)))

    def validate_code(self, code: str) -> list[str]:
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return [f"SyntaxError: {e}"]

        visitor = SecurityVisitor()
        visitor.visit(tree)
        return visitor.errors

    def execute(self, code: str, context: dict[str, Any] = None) -> dict[str, Any]:
        """
        Executes the provided code.
        context: Optional dictionary of variables to inject into the scope.
        """
        if context is None:
            context = {}

        # 1. AST Validation
        errors = self.validate_code(code)
        if errors:
            return {"error": "Security violation: " + "; ".join(errors)}

        # 2. Prepare Globals
        # We explicitly set __builtins__ to {} to prevent access to open, __import__, etc.
        # But we need to allow some basic builtins if needed (like len, range, int, float)
        safe_builtins = {
            "len": len, "range": range, "int": int, "float": float,
            "str": str, "list": list, "dict": dict, "tuple": tuple,
            "set": set, "bool": bool, "abs": abs, "min": min, "max": max,
            "sum": sum, "round": round, "enumerate": enumerate, "zip": zip
        }

        exec_globals = {
            "__builtins__": safe_builtins,
            **self.allowed_globals,
            **context
        }
        exec_locals = {}

        try:
            exec(code, exec_globals, exec_locals)
            return exec_locals
        except Exception as e:
            logger.error(f"Execution failed: {e}")
            return {"error": str(e)}
