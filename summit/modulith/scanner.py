from __future__ import annotations

import ast
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ImportEdge:
    source_file: Path
    source_module: str
    target_module: str
    target_symbol: str
    uses_event_channel: bool


def _is_event_channel(target_symbol: str) -> bool:
    return ".events." in target_symbol or target_symbol.endswith(".events")


def _module_prefixes(module_path: Path) -> set[str]:
    prefixes = {module_path.name}
    parts = list(module_path.parts)
    if "summit" in parts:
        idx = parts.index("summit")
        prefixes.add(".".join(parts[idx:]))
    return prefixes


def _symbol_to_module(symbol: str, module_paths: dict[str, Path]) -> str | None:
    normalized = symbol.replace("/", ".")
    for module_name, module_path in module_paths.items():
        for prefix in _module_prefixes(module_path):
            if normalized == prefix or normalized.startswith(f"{prefix}."):
                return module_name
    return None


def _imports_from_ast(file_path: Path) -> list[str]:
    tree = ast.parse(file_path.read_text(encoding="utf-8"), filename=str(file_path))
    symbols: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                symbols.append(alias.name)
        if isinstance(node, ast.ImportFrom) and node.module:
            symbols.append(node.module)
            for alias in node.names:
                symbols.append(f"{node.module}.{alias.name}")
    return symbols


def scan_import_edges(module_paths: dict[str, Path], python_files: list[Path], source_module_for: dict[Path, str]) -> list[ImportEdge]:
    edges: list[ImportEdge] = []
    for file_path in sorted(python_files):
        source_module = source_module_for[file_path]
        for symbol in sorted(set(_imports_from_ast(file_path))):
            target_module = _symbol_to_module(symbol, module_paths)
            if target_module and target_module != source_module:
                edges.append(
                    ImportEdge(
                        source_file=file_path,
                        source_module=source_module,
                        target_module=target_module,
                        target_symbol=symbol,
                        uses_event_channel=_is_event_channel(symbol),
                    )
                )
    return edges
