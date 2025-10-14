from __future__ import annotations

import sys
from pathlib import Path

# Ensure the package under test is importable without installation.
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))
