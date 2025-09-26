"""Image processing pipeline for Summit ML engine.

Provides a lightweight object detection scaffold built on OpenCV that
segments high-contrast objects using contour detection. The module can be
used as a library or as a CLI tool that emits JSON, which allows the
Node.js services to orchestrate detections and persist results in Neo4j.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable, List, Sequence

import cv2
import numpy as np


@dataclass
class BoundingBox:
    """Normalized bounding box representation."""

    x: float
    y: float
    width: float
    height: float
    area: int
    confidence: float


@dataclass
class Detection:
    """Container for a detected object."""

    object_id: str
    class_name: str
    confidence: float
    bounding_box: BoundingBox

    def to_json(self) -> dict:
        payload = asdict(self)
        payload["bounding_box"] = asdict(self.bounding_box)
        return payload


class ImageObjectDetector:
    """Simple contour-based detector for ingest-time processing."""

    def __init__(self, min_area: int = 500, dilation_iterations: int = 1) -> None:
        if min_area <= 0:
            raise ValueError("min_area must be positive")
        self.min_area = min_area
        self.dilation_iterations = dilation_iterations

    def detect(self, image_path: Path) -> Sequence[Detection]:
        """Detect prominent contours in the image."""

        if not image_path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")

        image = cv2.imread(str(image_path))
        if image is None:
            raise ValueError(f"Unable to read image: {image_path}")

        height, width = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 75, 200)
        dilated = cv2.dilate(edges, None, iterations=self.dilation_iterations)

        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        detections: List[Detection] = []
        for idx, contour in enumerate(contours):
            area = cv2.contourArea(contour)
            if area < self.min_area:
                continue

            x, y, w, h = cv2.boundingRect(contour)
            confidence = min(1.0, float(area) / float(width * height))
            bbox = BoundingBox(
                x=x / width,
                y=y / height,
                width=w / width,
                height=h / height,
                area=int(area),
                confidence=confidence,
            )
            detections.append(
                Detection(
                    object_id=f"det_{idx}",
                    class_name="object",
                    confidence=confidence,
                    bounding_box=bbox,
                )
            )

        return detections


def detections_to_json(detections: Iterable[Detection], image_path: Path) -> str:
    output = {
        "image_path": str(image_path),
        "detections": [det.to_json() for det in detections],
    }
    return json.dumps(output)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Summit contour-based object detection")
    parser.add_argument("--image", required=True, type=Path, help="Path to image file")
    parser.add_argument("--min-area", type=int, default=500, help="Minimum contour area to keep")
    parser.add_argument(
        "--dilation-iterations",
        type=int,
        default=1,
        help="Number of dilation iterations applied to the edge map",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    detector = ImageObjectDetector(min_area=args.min_area, dilation_iterations=args.dilation_iterations)
    detections = detector.detect(args.image)
    print(detections_to_json(detections, args.image))


if __name__ == "__main__":
    main()
