import ast
import os
from pathlib import Path
from typing import Dict, List, Set, Tuple

class ImportScanner(ast.NodeVisitor):
    def __init__(self, file_path: Path, base_path: Path):
        self.file_path = file_path
        self.base_path = base_path
        self.imports: List[Tuple[str, int]] = []

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            self.imports.append((alias.name, node.lineno))
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        module_name = node.module or ""
        # Handle relative imports
        if node.level > 0:
            # For simplicity, we can record the relative level.
            # But the verifier might prefer absolute names.
            # We can try to resolve it relative to self.file_path.
            pass

        self.imports.append((module_name, node.lineno))
        self.generic_visit(node)

def scan_file(file_path: Path, base_path: Path) -> List[Tuple[str, int]]:
    """Scan a single Python file for imports."""
    with open(file_path, "r", encoding="utf-8") as f:
        try:
            tree = ast.parse(f.read(), filename=str(file_path))
        except SyntaxError:
            return []

    scanner = ImportScanner(file_path, base_path)
    scanner.visit(tree)
    return scanner.imports

def scan_directory(directory: Path, base_path: Path) -> Dict[str, List[Tuple[str, int]]]:
    """Scan all Python files in a directory."""
    results = {}
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(".py"):
                file_path = Path(root) / file
                relative_path = file_path.relative_to(base_path)
                results[str(relative_path)] = scan_file(file_path, base_path)
    return results
