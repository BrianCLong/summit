import json
from pathlib import Path

import pytest

cv2 = pytest.importorskip("cv2")
np = pytest.importorskip("numpy")

from server.python.vision.image_processing import ImageObjectDetector, detections_to_json


def create_test_image(tmp_path: Path) -> Path:
    image_path = tmp_path / "synthetic.png"
    canvas = np.zeros((200, 200, 3), dtype=np.uint8)
    cv2.rectangle(canvas, (50, 50), (150, 150), (255, 255, 255), thickness=-1)
    cv2.imwrite(str(image_path), canvas)
    return image_path


def test_detector_finds_rectangle(tmp_path):
    image_path = create_test_image(tmp_path)
    detector = ImageObjectDetector(min_area=2000)
    detections = detector.detect(image_path)

    assert detections, "Detector should find at least one contour"
    detection = detections[0]
    bbox = detection.bounding_box

    # Bounding box should roughly match the rectangle
    assert bbox.width == pytest.approx(0.5, abs=0.05)
    assert bbox.height == pytest.approx(0.5, abs=0.05)
    assert bbox.x == pytest.approx(0.25, abs=0.05)
    assert bbox.y == pytest.approx(0.25, abs=0.05)


def test_detections_to_json(tmp_path):
    image_path = create_test_image(tmp_path)
    detector = ImageObjectDetector(min_area=2000)
    detections = detector.detect(image_path)

    payload = json.loads(detections_to_json(detections, image_path))
    assert payload["image_path"] == str(image_path)
    assert isinstance(payload["detections"], list)
    assert payload["detections"], "Serialized detections should not be empty"
