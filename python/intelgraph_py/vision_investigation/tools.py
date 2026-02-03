import hashlib
import math
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


def _generate_output_path(original_path: str, suffix: str, params: dict = None) -> str:
    directory, filename = os.path.split(original_path)
    name, ext = os.path.splitext(filename)

    # Create a deterministic hash based on inputs
    hasher = hashlib.sha256()
    hasher.update(original_path.encode('utf-8'))
    hasher.update(suffix.encode('utf-8'))
    if params:
        # Sort keys for consistent ordering
        for k in sorted(params.keys()):
            hasher.update(str(k).encode('utf-8'))
            hasher.update(str(params[k]).encode('utf-8'))

    hash_str = hasher.hexdigest()[:8]
    new_name = f"{name}_{suffix}_{hash_str}{ext}"
    return os.path.join(directory, new_name)

def crop_image(image_path: str, box: tuple[int, int, int, int]) -> dict:
    """
    Crops an image.
    box: (left, top, right, bottom)
    """
    try:
        with Image.open(image_path) as img:
            cropped = img.crop(box)
            output_path = _generate_output_path(image_path, "crop", {"box": box})
            cropped.save(output_path)
            return {
                "output_path": output_path,
                "metrics": {
                    "original_size": img.size,
                    "crop_box": box,
                    "crop_size": cropped.size
                }
            }
    except Exception as e:
        return {"error": str(e)}

def rotate_image(image_path: str, angle: float) -> dict:
    """Rotates an image by angle degrees."""
    try:
        with Image.open(image_path) as img:
            rotated = img.rotate(angle, expand=True)
            output_path = _generate_output_path(image_path, "rotate", {"angle": angle})
            rotated.save(output_path)
            return {
                "output_path": output_path,
                "metrics": {
                    "angle": angle,
                    "original_size": img.size,
                    "new_size": rotated.size
                }
            }
    except Exception as e:
        return {"error": str(e)}

def annotate_image(image_path: str, text: str, coords: tuple[int, int], color: str = "red") -> dict:
    """Draws text on the image at coords (x, y)."""
    try:
        with Image.open(image_path) as img:
            draw = ImageDraw.Draw(img)
            # Basic font handling
            try:
                # Try to load a standard font if available, or default
                font = ImageFont.load_default()
            except OSError:
                font = ImageFont.load_default()

            draw.text(coords, text, fill=color, font=font)
            output_path = _generate_output_path(image_path, "annotated", {"text": text, "coords": coords, "color": color})
            img.save(output_path)
            return {
                "output_path": output_path,
                "metrics": {
                    "annotation": text,
                    "coords": coords
                }
            }
    except Exception as e:
        return {"error": str(e)}

def measure_distance(image_path: str, point1: tuple[int, int], point2: tuple[int, int]) -> dict:
    """Measures pixel distance between two points."""
    try:
        x1, y1 = point1
        x2, y2 = point2
        distance = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
        return {
            "image_path": image_path,
            "metrics": {
                "point1": point1,
                "point2": point2,
                "distance": distance
            }
        }
    except Exception as e:
        return {"error": str(e)}

def count_connected_components(image_path: str) -> dict:
    """Counts connected components in the image (simple binarization)."""
    try:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return {"error": "Could not read image with OpenCV"}

        # Simple thresholding
        _, thresh = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY_INV)
        num_labels, labels = cv2.connectedComponents(thresh)

        # num_labels includes background, so subtract 1
        count = num_labels - 1

        return {
            "image_path": image_path,
            "metrics": {
                "count": count
            }
        }
    except Exception as e:
        return {"error": str(e)}
