import csv
import sys
from pathlib import Path

import pytest

# Ensure the ESA package can be imported without installation
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))


@pytest.fixture
def dataset_file(tmp_path: Path) -> Path:
    path = tmp_path / "dataset.csv"
    rows = [
        {"id": i, "group": "A" if i < 5 else "B", "weight": 1 + i, "value": 10 + i}
        for i in range(10)
    ]
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["id", "group", "weight", "value"])
        writer.writeheader()
        writer.writerows(rows)
    return path
