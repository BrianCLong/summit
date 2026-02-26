import pytest
from pathlib import Path
from summit.modulith.scanner import scan_file

def test_scan_file_basic_imports(tmp_path):
    code = """
import os
import sys
from typing import List
import summit.core.utils
from summit.ingest import pipeline
"""
    test_file = tmp_path / "test_file.py"
    test_file.write_text(code)

    imports = scan_file(test_file, tmp_path)

    import_names = [name for name, lineno in imports]
    assert "os" in import_names
    assert "sys" in import_names
    assert "typing" in import_names
    assert "summit.core.utils" in import_names
    assert "summit.ingest" in import_names

def test_scan_file_from_imports(tmp_path):
    code = """
from summit.policy.engine import PolicyEngine
from . import local_mod
from ..parent import parent_mod
"""
    test_file = tmp_path / "test_file.py"
    test_file.write_text(code)

    imports = scan_file(test_file, tmp_path)
    import_names = [name for name, lineno in imports]

    assert "summit.policy.engine" in import_names
    # Relative imports are handled but we should check how they are returned.
    # Current implementation returns node.module which is None for 'from . import ...'
    # Actually if node.module is None it's not added.

def test_scan_file_syntax_error(tmp_path):
    test_file = tmp_path / "bad.py"
    test_file.write_text("this is not python code")

    imports = scan_file(test_file, tmp_path)
    assert imports == []
