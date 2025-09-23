from __future__ import annotations

from collections import deque
from collections.abc import Iterable, Iterator

import numpy as np

try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    cv2 = None  # type: ignore


def detect_faces(image: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Detect faces in an image.

    Uses OpenCV Haar cascades when available. If OpenCV is not installed,
    returns an empty list.
    """
    if cv2 is None:
        return []
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    classifier = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    faces = classifier.detectMultiScale(gray, 1.1, 4)
    return [(int(x), int(y), int(w), int(h)) for (x, y, w, h) in faces]


nparray = np.ndarray


class MicroexpressionAnalyzer:
    """Incremental microexpression analyzer.

    Maintains a sliding window of grayscale frames and computes the mean
    frame-to-frame difference which can be treated as microexpression intensity.
    """

    def __init__(self, window: int = 3):
        self.window = window
        self.frames: deque[nparray] = deque(maxlen=window)

    def update(self, frame: nparray) -> float | None:
        """Ingest a new frame and return the current microexpression score."""
        if cv2 is not None:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        else:
            gray = frame.mean(axis=2)
        self.frames.append(gray)
        if len(self.frames) < self.window:
            return None
        diffs = [
            float(np.mean(np.abs(self.frames[i] - self.frames[i + 1])))
            for i in range(self.window - 1)
        ]
        return float(np.mean(diffs))


def ingest_stream(
    frames: Iterable[nparray], analyzer: MicroexpressionAnalyzer
) -> Iterator[float | None]:
    """Consume a stream of frames yielding microexpression metrics."""
    for frame in frames:
        yield analyzer.update(frame)
