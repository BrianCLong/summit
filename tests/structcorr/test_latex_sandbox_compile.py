import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from summit.structcorr.validators.latex_compile import validate_latex_sandbox


def test_latex_safe_mode_blocks_write18() -> None:
    findings = validate_latex_sandbox(r"\\documentclass{article}\\begin{document}\\write18{ls}\\end{document}")
    safe_mode = next(item for item in findings if item["rule"] == "latex.safe_mode")
    assert safe_mode["severity"] == "fail"


def test_latex_balanced_braces_pass() -> None:
    findings = validate_latex_sandbox(r"\\textbf{ok}")
    braces = next(item for item in findings if item["rule"] == "latex.syntax_brace_balance")
    assert braces["severity"] == "info"
