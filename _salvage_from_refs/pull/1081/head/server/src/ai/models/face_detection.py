#!/usr/bin/env python3
"""
Face Detection Script using MTCNN
"""

import argparse
import json
import sys
import warnings
from typing import Any

import cv2
import numpy as np

try:
    import torch
    from facenet_pytorch import InceptionResnetV1
    from mtcnn import MTCNN
except ImportError:
    print(json.dumps({"error": "Required packages not installed: mtcnn, facenet-pytorch"}))
    sys.exit(1)

warnings.filterwarnings("ignore")


class FaceDetector:
    def __init__(self, device: str = "cpu"):
        self.device = device
        self.detector = MTCNN(keep_all=True, device=device)
        self.feature_extractor = None

        try:
            self.feature_extractor = InceptionResnetV1(pretrained="vggface2").eval()
            if device == "cuda" and torch.cuda.is_available():
                self.feature_extractor = self.feature_extractor.cuda()
        except:
            print("Feature extractor not available", file=sys.stderr)

    def detect_faces(
        self, image_path: str, min_face_size: int = 20, confidence_threshold: float = 0.7
    ) -> dict[str, Any]:
        """Detect faces in image"""
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                return {"error": "Could not load image"}

            # Convert BGR to RGB
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            # Detect faces
            result = self.detector.detect(rgb_image)

            if result[0] is None:
                return {"faces": [], "face_count": 0}

            boxes, probs, landmarks = result
            faces = []

            for i, (box, prob, landmark) in enumerate(zip(boxes, probs, landmarks, strict=False)):
                if prob >= confidence_threshold:
                    x, y, width, height = box

                    # Check minimum face size
                    if width >= min_face_size and height >= min_face_size:
                        face_data = {
                            "bbox": [int(x), int(y), int(width), int(height)],
                            "confidence": float(prob),
                            "landmarks": self._format_landmarks(landmark),
                            "face_id": i,
                        }

                        # Extract features if possible
                        if self.feature_extractor is not None:
                            try:
                                features = self._extract_features(rgb_image, box)
                                face_data["features"] = (
                                    features.tolist() if features is not None else None
                                )
                            except:
                                face_data["features"] = None

                        faces.append(face_data)

            return {
                "faces": faces,
                "face_count": len(faces),
                "image_size": {"width": rgb_image.shape[1], "height": rgb_image.shape[0]},
            }

        except Exception as e:
            return {"error": f"Face detection failed: {str(e)}"}

    def _format_landmarks(self, landmarks: np.ndarray) -> dict[str, list[float]]:
        """Format facial landmarks"""
        if landmarks is None or len(landmarks) != 5:
            return {}

        return {
            "left_eye": [float(landmarks[0][0]), float(landmarks[0][1])],
            "right_eye": [float(landmarks[1][0]), float(landmarks[1][1])],
            "nose": [float(landmarks[2][0]), float(landmarks[2][1])],
            "mouth_left": [float(landmarks[3][0]), float(landmarks[3][1])],
            "mouth_right": [float(landmarks[4][0]), float(landmarks[4][1])],
        }

    def _extract_features(self, image: np.ndarray, bbox: list[float]) -> np.ndarray:
        """Extract facial features"""
        if self.feature_extractor is None:
            return None

        try:
            x, y, w, h = bbox
            x, y, w, h = int(x), int(y), int(w), int(h)

            # Crop face
            face = image[y : y + h, x : x + w]
            if face.size == 0:
                return None

            # Resize to 160x160 (required by InceptionResnetV1)
            face = cv2.resize(face, (160, 160))

            # Convert to tensor
            face_tensor = torch.tensor(face).permute(2, 0, 1).float()
            face_tensor = (face_tensor - 127.5) / 128.0  # Normalize
            face_tensor = face_tensor.unsqueeze(0)

            if self.device == "cuda" and torch.cuda.is_available():
                face_tensor = face_tensor.cuda()

            # Extract features
            with torch.no_grad():
                features = self.feature_extractor(face_tensor)
                return features.cpu().numpy().flatten()

        except Exception as e:
            print(f"Feature extraction failed: {e}", file=sys.stderr)
            return None


def main():
    parser = argparse.ArgumentParser(description="Face Detection")
    parser.add_argument("--image", required=True, help="Path to image file")
    parser.add_argument("--min-face-size", type=int, default=20, help="Minimum face size")
    parser.add_argument("--confidence", type=float, default=0.7, help="Confidence threshold")
    parser.add_argument("--device", default="cpu", help="Device (cpu/cuda)")

    args = parser.parse_args()

    detector = FaceDetector(args.device)
    result = detector.detect_faces(args.image, args.min_face_size, args.confidence)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
