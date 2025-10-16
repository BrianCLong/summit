"""
Main Detection Module for Adversarial Misinformation Defense Platform

This module integrates all detection modules and provides a unified interface
for detecting adversarial misinformation across multiple modalities.
"""

import json
import logging
from pathlib import Path
from typing import Any

import numpy as np

from .audio_detector import AudioDetector
from .deepfake_detector import DeepfakeDetector
from .image_detector import ImageDetector
from .meme_detector import MemeDetector
from .text_detector import TextDetector
from .video_detector import VideoDetector


class AdversarialMisinfoDetector:
    """
    Main detector that integrates all modality-specific detectors
    """

    def __init__(self):
        """
        Initialize all detection modules
        """
        self.text_detector = TextDetector()
        self.image_detector = ImageDetector()
        self.audio_detector = AudioDetector()
        self.video_detector = VideoDetector()
        self.meme_detector = MemeDetector()
        self.deepfake_detector = DeepfakeDetector()

        # Configure logging
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)

        # Initialize pattern lists for adversarial samples
        self.pattern_lists = {
            "text": [],
            "image": [],
            "audio": [],
            "video": [],
            "meme": [],
            "deepfake": [],
        }

    def detect_text_misinfo(self, texts: list[str]) -> list[dict[str, Any]]:
        """
        Detect misinformation in text content
        """
        self.logger.info(f"Analyzing {len(texts)} text samples for misinformation")
        return self.text_detector.detect_misinfo(texts)

    def detect_image_misinfo(self, image_paths: list[str | Path]) -> list[dict[str, Any]]:
        """
        Detect misinformation in image content
        """
        self.logger.info(f"Analyzing {len(image_paths)} images for misinformation")
        return self.image_detector.detect_misinfo(image_paths)

    def detect_audio_misinfo(self, audio_paths: list[str | Path]) -> list[dict[str, Any]]:
        """
        Detect misinformation in audio content
        """
        self.logger.info(f"Analyzing {len(audio_paths)} audio files for misinformation")
        return self.audio_detector.detect_misinfo(audio_paths)

    def detect_video_misinfo(self, video_paths: list[str | Path]) -> list[dict[str, Any]]:
        """
        Detect misinformation in video content
        """
        self.logger.info(f"Analyzing {len(video_paths)} videos for misinformation")
        return self.video_detector.detect_misinfo(video_paths)

    def detect_meme_misinfo(self, meme_paths: list[str | Path]) -> list[dict[str, Any]]:
        """
        Detect misinformation in meme content
        """
        self.logger.info(f"Analyzing {len(meme_paths)} memes for misinformation")
        return self.meme_detector.detect_misinfo(meme_paths)

    def detect_deepfake_misinfo(
        self, media_paths: list[str | Path], media_types: list[str]
    ) -> list[dict[str, Any]]:
        """
        Detect deepfake content across multiple modalities
        """
        self.logger.info(f"Analyzing {len(media_paths)} media files for deepfakes")
        return self.deepfake_detector.detect_misinfo(media_paths, media_types)

    def detect_all_modalities(self, content_dict: dict[str, list[Any]]) -> dict[str, Any]:
        """
        Detect misinformation across all modalities simultaneously

        Args:
            content_dict: Dictionary with keys as modality types and values as lists of content
                         {
                             'text': [list of strings],
                             'images': [list of image paths],
                             'audio': [list of audio paths],
                             'videos': [list of video paths],
                             'memes': [list of meme paths]
                         }
        """
        results = {}

        # Process text content
        if "text" in content_dict and content_dict["text"]:
            results["text_results"] = self.detect_text_misinfo(content_dict["text"])

        # Process image content
        if "images" in content_dict and content_dict["images"]:
            results["image_results"] = self.detect_image_misinfo(content_dict["images"])

        # Process audio content
        if "audio" in content_dict and content_dict["audio"]:
            results["audio_results"] = self.detect_audio_misinfo(content_dict["audio"])

        # Process video content
        if "videos" in content_dict and content_dict["videos"]:
            results["video_results"] = self.detect_video_misinfo(content_dict["videos"])

        # Process meme content
        if "memes" in content_dict and content_dict["memes"]:
            results["meme_results"] = self.detect_meme_misinfo(content_dict["memes"])

        # Process deepfake content
        if "deepfake_media" in content_dict and content_dict["deepfake_media"]:
            media_paths = content_dict["deepfake_media"]["paths"]
            media_types = content_dict["deepfake_media"]["types"]
            results["deepfake_results"] = self.detect_deepfake_misinfo(media_paths, media_types)

        # Calculate overall aggregated score
        results["aggregated_analysis"] = self._aggregate_results(results)

        return results

    def _aggregate_results(self, individual_results: dict[str, Any]) -> dict[str, Any]:
        """
        Aggregate results from all modalities into an overall assessment
        """
        aggregation = {
            "total_misinfo_score": 0.0,
            "confidence": 0.0,
            "high_risk_items": 0,
            "modality_breakdown": {},
        }

        total_score = 0.0
        total_confidence = 0.0
        high_risk_count = 0
        modality_count = 0

        # Process text results
        if "text_results" in individual_results:
            text_scores = [result["misinfo_score"] for result in individual_results["text_results"]]
            text_confidences = [
                result["confidence"] for result in individual_results["text_results"]
            ]
            text_high_risk = sum(
                1 for result in individual_results["text_results"] if result["misinfo_score"] > 0.5
            )

            aggregation["modality_breakdown"]["text"] = {
                "average_misinfo_score": np.mean(text_scores) if text_scores else 0.0,
                "average_confidence": np.mean(text_confidences) if text_confidences else 0.0,
                "high_risk_count": text_high_risk,
                "total_count": len(text_scores),
            }

            if text_scores:
                total_score += np.mean(text_scores)
                modality_count += 1
            if text_confidences:
                total_confidence += np.mean(text_confidences)
            high_risk_count += text_high_risk

        # Process image results
        if "image_results" in individual_results:
            image_scores = [
                result["misinfo_score"] for result in individual_results["image_results"]
            ]
            image_confidences = [
                result["confidence"] for result in individual_results["image_results"]
            ]
            image_high_risk = sum(
                1 for result in individual_results["image_results"] if result["misinfo_score"] > 0.5
            )

            aggregation["modality_breakdown"]["image"] = {
                "average_misinfo_score": np.mean(image_scores) if image_scores else 0.0,
                "average_confidence": np.mean(image_confidences) if image_confidences else 0.0,
                "high_risk_count": image_high_risk,
                "total_count": len(image_scores),
            }

            if image_scores:
                total_score += np.mean(image_scores)
                modality_count += 1
            if image_confidences:
                total_confidence += np.mean(image_confidences)
            high_risk_count += image_high_risk

        # Process audio results
        if "audio_results" in individual_results:
            audio_scores = [
                result["misinfo_score"] for result in individual_results["audio_results"]
            ]
            audio_confidences = [
                result["confidence"] for result in individual_results["audio_results"]
            ]
            audio_high_risk = sum(
                1 for result in individual_results["audio_results"] if result["misinfo_score"] > 0.5
            )

            aggregation["modality_breakdown"]["audio"] = {
                "average_misinfo_score": np.mean(audio_scores) if audio_scores else 0.0,
                "average_confidence": np.mean(audio_confidences) if audio_confidences else 0.0,
                "high_risk_count": audio_high_risk,
                "total_count": len(audio_scores),
            }

            if audio_scores:
                total_score += np.mean(audio_scores)
                modality_count += 1
            if audio_confidences:
                total_confidence += np.mean(audio_confidences)
            high_risk_count += audio_high_risk

        # Process video results
        if "video_results" in individual_results:
            video_scores = [
                result["misinfo_score"] for result in individual_results["video_results"]
            ]
            video_confidences = [
                result["confidence"] for result in individual_results["video_results"]
            ]
            video_high_risk = sum(
                1 for result in individual_results["video_results"] if result["misinfo_score"] > 0.5
            )

            aggregation["modality_breakdown"]["video"] = {
                "average_misinfo_score": np.mean(video_scores) if video_scores else 0.0,
                "average_confidence": np.mean(video_confidences) if video_confidences else 0.0,
                "high_risk_count": video_high_risk,
                "total_count": len(video_scores),
            }

            if video_scores:
                total_score += np.mean(video_scores)
                modality_count += 1
            if video_confidences:
                total_confidence += np.mean(video_confidences)
            high_risk_count += video_high_risk

        # Process meme results
        if "meme_results" in individual_results:
            meme_scores = [result["misinfo_score"] for result in individual_results["meme_results"]]
            meme_confidences = [
                result["confidence"] for result in individual_results["meme_results"]
            ]
            meme_high_risk = sum(
                1 for result in individual_results["meme_results"] if result["misinfo_score"] > 0.5
            )

            aggregation["modality_breakdown"]["meme"] = {
                "average_misinfo_score": np.mean(meme_scores) if meme_scores else 0.0,
                "average_confidence": np.mean(meme_confidences) if meme_confidences else 0.0,
                "high_risk_count": meme_high_risk,
                "total_count": len(meme_scores),
            }

            if meme_scores:
                total_score += np.mean(meme_scores)
                modality_count += 1
            if meme_confidences:
                total_confidence += np.mean(meme_confidences)
            high_risk_count += meme_high_risk

        # Process deepfake results
        if "deepfake_results" in individual_results:
            deepfake_scores = [
                result["misinfo_score"] for result in individual_results["deepfake_results"]
            ]
            deepfake_confidences = [
                result["confidence"] for result in individual_results["deepfake_results"]
            ]
            deepfake_high_risk = sum(
                1
                for result in individual_results["deepfake_results"]
                if result["misinfo_score"] > 0.5
            )

            aggregation["modality_breakdown"]["deepfake"] = {
                "average_misinfo_score": np.mean(deepfake_scores) if deepfake_scores else 0.0,
                "average_confidence": (
                    np.mean(deepfake_confidences) if deepfake_confidences else 0.0
                ),
                "high_risk_count": deepfake_high_risk,
                "total_count": len(deepfake_scores),
            }

            if deepfake_scores:
                total_score += np.mean(deepfake_scores)
                modality_count += 1
            if deepfake_confidences:
                total_confidence += np.mean(deepfake_confidences)
            high_risk_count += deepfake_high_risk

        # Calculate final aggregated scores
        aggregation["total_misinfo_score"] = (
            total_score / modality_count if modality_count > 0 else 0.0
        )
        aggregation["confidence"] = total_confidence / modality_count if modality_count > 0 else 0.0
        aggregation["high_risk_items"] = high_risk_count

        # Determine overall risk level
        avg_score = aggregation["total_misinfo_score"]
        if avg_score > 0.7:
            aggregation["risk_level"] = "HIGH"
        elif avg_score > 0.4:
            aggregation["risk_level"] = "MEDIUM"
        else:
            aggregation["risk_level"] = "LOW"

        return aggregation

    def generate_adversarial_samples(
        self, content_dict: dict[str, list[Any]], num_samples: int = 5
    ) -> dict[str, Any]:
        """
        Generate adversarial samples for training improvement across all modalities
        """
        adversarial_samples = {}

        # Generate adversarial text samples
        if "text" in content_dict and content_dict["text"]:
            adversarial_samples["text"] = self.text_detector.generate_adversarial_samples(
                content_dict["text"], num_samples
            )

        # Generate adversarial image samples (placeholder - would need actual images)
        # In practice, you would pass actual image objects to the detector
        if "images" in content_dict and content_dict["images"]:
            # This is a placeholder since we don't have actual image objects here
            adversarial_samples["images"] = ["adversarial_image_placeholder"] * num_samples

        # Generate adversarial audio samples (placeholder)
        if "audio" in content_dict and content_dict["audio"]:
            # This is a placeholder since we don't have actual audio data here
            adversarial_samples["audio"] = ["adversarial_audio_placeholder"] * num_samples

        # Generate adversarial video samples (placeholder)
        if "videos" in content_dict and content_dict["videos"]:
            # This is a placeholder since we don't have actual video data here
            adversarial_samples["videos"] = ["adversarial_video_placeholder"] * num_samples

        # Generate adversarial meme samples (placeholder)
        if "memes" in content_dict and content_dict["memes"]:
            # This is a placeholder since we don't have actual meme data here
            adversarial_samples["memes"] = ["adversarial_meme_placeholder"] * num_samples

        # Generate adversarial deepfake samples (placeholder)
        if "deepfake_media" in content_dict and content_dict["deepfake_media"]:
            # This is a placeholder since we don't have actual media here
            adversarial_samples["deepfake"] = ["adversarial_deepfake_placeholder"] * num_samples

        return adversarial_samples

    def update_detection_libraries(
        self, training_data: dict[str, Any], labels: dict[str, list[int]]
    ):
        """
        Update detection libraries with new training data
        """
        # Update text detector
        if "text" in training_data and training_data["text"]:
            self.text_detector.fine_tune_model(training_data["text"], labels["text"])

        # Update image detector (would need actual images)
        # In practice, you would pass actual image data to the detector

        # Update audio detector (would need actual audio)
        # In practice, you would pass actual audio data to the detector

        # Update video detector (would need actual videos)
        # In practice, you would pass actual video data to the detector

        # Update meme detector (would need actual memes)
        # In practice, you would pass actual meme data to the detector

        # Update deepfake detector (would need actual media)
        # In practice, you would pass actual media to the detector

        self.logger.info("Updated detection libraries with new training data")

    def add_pattern_list(self, modality: str, patterns: list[str]):
        """
        Add pattern lists for adversarial sample generation
        """
        if modality in self.pattern_lists:
            self.pattern_lists[modality].extend(patterns)
            # Remove duplicates
            self.pattern_lists[modality] = list(set(self.pattern_lists[modality]))

            # Update respective detector with new patterns
            if modality == "text":
                self.text_detector.update_patterns(patterns)

            self.logger.info(f"Added {len(patterns)} new patterns for {modality} modality")
        else:
            self.logger.warning(f"Invalid modality: {modality}")

    def save_results(self, results: dict[str, Any], output_path: str | Path):
        """
        Save detection results to file
        """
        try:
            with open(str(output_path), "w") as f:
                json.dump(results, f, indent=2, default=str)
            self.logger.info(f"Saved results to {output_path}")
        except Exception as e:
            self.logger.error(f"Failed to save results: {str(e)}")

    def load_results(self, input_path: str | Path) -> dict[str, Any]:
        """
        Load previously saved detection results
        """
        try:
            with open(str(input_path)) as f:
                results = json.load(f)
            self.logger.info(f"Loaded results from {input_path}")
            return results
        except Exception as e:
            self.logger.error(f"Failed to load results: {str(e)}")
            return {}


# Convenience function for easy usage
def create_detector() -> AdversarialMisinfoDetector:
    """
    Factory function to create and initialize the adversarial misinformation detector
    """
    return AdversarialMisinfoDetector()
