from __future__ import annotations

import ast
from dataclasses import dataclass
from pathlib import Path

from .config import ModulithConfig


@dataclass(frozen=True)
class ImportEdge:
    source_file: str
    source_module: str
    target_module: str
    import_name: str
    import_kind: str



def _scan_ast(module_ast: ast.AST) -> list[tuple[str, str]]:
    imports: list[tuple[str, str]] = []
    for node in ast.walk(module_ast):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append((alias.name, "import"))
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.append((node.module, "from"))
        elif isinstance(node, ast.Call):
            if (
                isinstance(node.func, ast.Attribute)
                and isinstance(node.func.value, ast.Name)
                and node.func.value.id == "importlib"
                and node.func.attr == "import_module"
                and node.args
                and isinstance(node.args[0], ast.Constant)
                and isinstance(node.args[0].value, str)
            ):
                imports.append((node.args[0].value, "dynamic"))
    return imports


def scan_import_edges(config: ModulithConfig) -> list[ImportEdge]:
    edges: list[ImportEdge] = []

    for module in sorted(config.modules.values(), key=lambda x: x.name):
        for path in sorted(module.path.rglob("*.py")):
            parsed = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
            for import_name, kind in _scan_ast(parsed):
                target = config.module_for_import(import_name)
                if not target or target == module.name:
                    continue
                edges.append(
                    ImportEdge(
                        source_file=str(path),
                        source_module=module.name,
                        target_module=target,
                        import_name=import_name,
                        import_kind=kind,
                    )
                )

    return sorted(edges, key=lambda e: (e.source_module, e.target_module, e.source_file, e.import_name, e.import_kind))
