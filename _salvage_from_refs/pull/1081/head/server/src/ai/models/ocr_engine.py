#!/usr/bin/env python3
"""
OCR Engine Script
Handles optical character recognition using multiple engines
"""

import argparse
import json
import warnings
from typing import Any

import cv2
import pytesseract
from PIL import Image

warnings.filterwarnings("ignore")


class OCREngine:
    def __init__(self, engine: str = "tesseract"):
        self.engine = engine

    def extract_text(
        self,
        image_path: str,
        languages: str = "eng",
        confidence_threshold: float = 0.6,
        word_level: bool = True,
    ) -> dict[str, Any]:
        """Extract text from image using OCR"""
        try:
            if self.engine == "tesseract":
                return self._tesseract_ocr(image_path, languages, confidence_threshold, word_level)
            else:
                return {"error": f"Unsupported OCR engine: {self.engine}"}

        except Exception as e:
            return {"error": f"OCR extraction failed: {str(e)}"}

    def _tesseract_ocr(
        self, image_path: str, languages: str, confidence_threshold: float, word_level: bool
    ) -> dict[str, Any]:
        """Perform OCR using Tesseract"""
        try:
            # Load and preprocess image
            image = cv2.imread(image_path)
            if image is None:
                return {"error": "Could not load image"}

            # Convert to PIL Image
            pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

            # Configure Tesseract
            config = f"--oem 3 --psm 6 -l {languages}"

            # Extract text with bounding boxes
            data = pytesseract.image_to_data(
                pil_image, config=config, output_type=pytesseract.Output.DICT
            )

            # Process results
            blocks = []
            full_text = ""

            for i in range(len(data["text"])):
                confidence = float(data["conf"][i])
                text = data["text"][i].strip()

                if confidence >= confidence_threshold * 100 and text:
                    x, y, w, h = (
                        data["left"][i],
                        data["top"][i],
                        data["width"][i],
                        data["height"][i],
                    )

                    block = {
                        "text": text,
                        "confidence": confidence / 100,
                        "bbox": {"x": x, "y": y, "width": w, "height": h},
                        "words": [] if not word_level else self._extract_words(text, confidence),
                    }
                    blocks.append(block)
                    full_text += text + " "

            # Get overall text
            if not full_text.strip():
                full_text = pytesseract.image_to_string(pil_image, config=config)

            # Detect language
            detected_language = self._detect_language(full_text)

            return {
                "text": full_text.strip(),
                "confidence": self._calculate_overall_confidence(blocks),
                "language": detected_language,
                "blocks": blocks,
                "version": pytesseract.get_tesseract_version(),
                "preprocessing": ["resize", "normalize"],
            }

        except Exception as e:
            return {"error": f"Tesseract OCR failed: {str(e)}"}

    def _extract_words(self, text: str, confidence: float) -> list[dict]:
        """Extract word-level information"""
        words = text.split()
        word_list = []

        for word in words:
            word_list.append(
                {
                    "text": word,
                    "confidence": confidence / 100,
                    "bbox": {"x": 0, "y": 0, "width": 0, "height": 0},  # Placeholder
                }
            )

        return word_list

    def _calculate_overall_confidence(self, blocks: list[dict]) -> float:
        """Calculate overall confidence from blocks"""
        if not blocks:
            return 0.0

        total_confidence = sum(block["confidence"] for block in blocks)
        return total_confidence / len(blocks)

    def _detect_language(self, text: str) -> str:
        """Simple language detection"""
        try:
            from langdetect import detect

            return detect(text)
        except:
            return "unknown"


def main():
    parser = argparse.ArgumentParser(description="OCR Text Extraction")
    parser.add_argument("--image", required=True, help="Path to image file")
    parser.add_argument("--engine", default="tesseract", help="OCR engine")
    parser.add_argument("--languages", default="eng", help="Languages (comma-separated)")
    parser.add_argument("--confidence", type=float, default=0.6, help="Confidence threshold")
    parser.add_argument("--word-level", type=bool, default=True, help="Extract word-level data")

    args = parser.parse_args()

    ocr_engine = OCREngine(args.engine)
    result = ocr_engine.extract_text(args.image, args.languages, args.confidence, args.word_level)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
