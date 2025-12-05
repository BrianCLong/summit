import sys
from pathlib import Path

# Ensure the package under mrse/src is importable when tests run from repo root.
ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if SRC.exists():
    sys.path.insert(0, str(SRC))
