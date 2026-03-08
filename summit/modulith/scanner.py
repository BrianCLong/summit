from __future__ import annotations

import ast
from dataclasses import dataclass
from pathlib import Path

from summit.modulith.schemas import ModulithConfig


@dataclass(frozen=True)
class ImportEdge:
    source_file: str
    source_module: str
    target_import: str
    target_module: str
    line: int
    import_kind: str


def _iter_python_files(repo_root: Path) -> list[Path]:
    return sorted(path for path in repo_root.rglob("*.py") if ".venv/" not in path.as_posix())


def scan_imports(repo_root: Path, config: ModulithConfig) -> tuple[list[ImportEdge], list[dict[str, object]]]:
    edges: list[ImportEdge] = []
    dynamic_candidates: list[dict[str, object]] = []

    for pyfile in _iter_python_files(repo_root):
        src_module = config.module_for_file(pyfile, repo_root)
        if src_module is None:
            continue
        tree = ast.parse(pyfile.read_text(encoding="utf-8"), filename=str(pyfile))

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    target_module = config.module_for_import(alias.name)
                    if target_module is None:
                        continue
                    edges.append(
                        ImportEdge(
                            source_file=str(pyfile.relative_to(repo_root)),
                            source_module=src_module,
                            target_import=alias.name,
                            target_module=target_module,
                            line=node.lineno,
                            import_kind="import",
                        )
                    )
            elif isinstance(node, ast.ImportFrom) and node.module:
                target_module = config.module_for_import(node.module)
                if target_module is None:
                    continue
                edges.append(
                    ImportEdge(
                        source_file=str(pyfile.relative_to(repo_root)),
                        source_module=src_module,
                        target_import=node.module,
                        target_module=target_module,
                        line=node.lineno,
                        import_kind="from",
                    )
                )
            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name):
                    if node.func.value.id == "importlib" and node.func.attr == "import_module" and node.args:
                        arg = node.args[0]
                        if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                            target_module = config.module_for_import(arg.value)
                            if target_module is None:
                                continue
                            dynamic_candidates.append(
                                {
                                    "source_file": str(pyfile.relative_to(repo_root)),
                                    "source_module": src_module,
                                    "target_import": arg.value,
                                    "target_module": target_module,
                                    "line": node.lineno,
                                }
                            )

    return sorted(edges, key=lambda e: (e.source_file, e.line, e.target_import)), sorted(
        dynamic_candidates,
        key=lambda c: (
            str(c["source_file"]),
            int(c["line"]),
            str(c["target_import"]),
        ),
    )
