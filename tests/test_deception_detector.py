import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parent.parent))

from intelgraph.deception_detector import DeceptionDetector


def test_score_range():
    detector = DeceptionDetector()
    score = detector.score("This is a harmless message.")
    assert 0.0 <= score <= 1.0
