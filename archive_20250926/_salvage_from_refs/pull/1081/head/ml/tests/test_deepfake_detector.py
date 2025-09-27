import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from intelgraph_ai_ml.deepfake_detector import DeepfakeDetector


def test_detect_returns_scores(tmp_path: Path) -> None:
    dummy = tmp_path / "dummy.txt"
    dummy.write_text("hello")
    detector = DeepfakeDetector()
    result = detector.detect(str(dummy), media_type="audio")
    assert 0.0 <= result.deepfake_score <= 1.0
