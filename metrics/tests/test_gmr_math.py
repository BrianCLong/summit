from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1] / "evals"))

from gmr_math import mad, median  # noqa: E402


def test_median_even_odd() -> None:
    assert median([3, 1, 2]) == 2
    assert median([1, 2, 3, 4]) == 2.5


def test_mad_example() -> None:
    values = [1.0, 1.0, 2.0, 2.0, 4.0, 6.0, 9.0]
    assert median(values) == 2.0
    assert mad(values) == 1.0
