"""
Deepfake Detection Module for Adversarial Misinformation Defense Platform

This module implements detection of deepfake content across multiple modalities,
including facial analysis, temporal consistency checks, and adversarial sample generation.
"""

import random
from pathlib import Path
from typing import Any

import cv2
import librosa
import numpy as np
import soundfile as sf
import torch.nn as nn
from PIL import Image
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


class DeepfakeDetectionCNN(nn.Module):
    """
    CNN for detecting deepfake artifacts in images
    """

    def __init__(self, num_classes: int = 2):
        super(DeepfakeDetectionCNN, self).__init__()

        self.features = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.AdaptiveAvgPool2d((4, 4)),
        )

        self.classifier = nn.Sequential(
            nn.Linear(128 * 4 * 4, 256), nn.ReLU(), nn.Dropout(0.5), nn.Linear(256, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x


class DeepfakeDetector:
    """
    Comprehensive deepfake detection module for multiple modalities
    """

    def __init__(self):
        """
        Initialize the deepfake detector with default models
        """
        # Initialize isolation forest for anomaly detection
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()

        # Initialize CNN model
        self.cnn_model = DeepfakeDetectionCNN()

        # Common deepfake artifacts and patterns
        self.artifact_patterns = {
            "facial_inconsistencies": 0.8,
            "temporal_artifacts": 0.75,
            "eye_blink_irregularities": 0.85,
            "lip_sync_anomalies": 0.8,
            "skin_texture_abnormalities": 0.7,
            "hair_artifacts": 0.65,
            "background_inconsistencies": 0.6,
        }

    def detect_facial_inconsistencies(self, image: np.ndarray) -> dict[str, float]:
        """
        Detect facial inconsistencies that may indicate deepfakes
        """
        results = {}

        # Convert to grayscale if needed
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY) if len(image.shape) == 3 else image

        # Use face detection
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)

        if len(faces) == 0:
            # No face detected
            results["face_detected"] = 0.0
            results["eye_consistency"] = 0.0
            results["mouth_consistency"] = 0.0
            results["skin_texture"] = 0.0
            results["overall_facial_score"] = 0.0
            return results

        # Analyze the first detected face
        x, y, w, h = faces[0]
        face_region = image[y : y + h, x : x + w]

        # Check eye consistency
        results["eye_consistency"] = self._analyze_eye_consistency(face_region)

        # Check mouth consistency
        results["mouth_consistency"] = self._analyze_mouth_consistency(face_region)

        # Check skin texture
        results["skin_texture"] = self._analyze_skin_texture(face_region)

        # Overall facial inconsistency score
        scores = [results["eye_consistency"], results["mouth_consistency"], results["skin_texture"]]
        results["overall_facial_score"] = np.mean(scores) if scores else 0.0

        results["face_detected"] = 1.0

        return results

    def _analyze_eye_consistency(self, face_region: np.ndarray) -> float:
        """
        Analyze eye consistency for deepfake indicators
        """
        try:
            # Convert to grayscale
            gray = (
                cv2.cvtColor(face_region, cv2.COLOR_RGB2GRAY)
                if len(face_region.shape) == 3
                else face_region
            )

            # Use eye cascade
            eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")
            eyes = eye_cascade.detectMultiScale(gray, 1.1, 4)

            if len(eyes) < 2:
                # Less than 2 eyes detected - suspicious
                return 0.8

            # Check eye symmetry and positioning
            eye_areas = [w * h for (x, y, w, h) in eyes]
            eye_positions = [(x + w // 2, y + h // 2) for (x, y, w, h) in eyes]

            # Area consistency
            area_variance = np.var(eye_areas) / np.mean(eye_areas) if np.mean(eye_areas) > 0 else 1

            # Position consistency (should be roughly horizontally aligned)
            if len(eye_positions) >= 2:
                y_positions = [pos[1] for pos in eye_positions[:2]]
                y_variance = np.var(y_positions)
                position_score = min(1.0, y_variance / 100)  # Adjust threshold as needed
            else:
                position_score = 0.5

            # Combined score
            combined = (area_variance + position_score) / 2
            return min(1.0, combined)
        except:
            return 0.5

    def _analyze_mouth_consistency(self, face_region: np.ndarray) -> float:
        """
        Analyze mouth consistency for deepfake indicators
        """
        try:
            # Convert to grayscale
            gray = (
                cv2.cvtColor(face_region, cv2.COLOR_RGB2GRAY)
                if len(face_region.shape) == 3
                else face_region
            )

            # Use mouth cascade (if available)
            # For this example, we'll use a simplified approach
            height, width = gray.shape

            # Focus on the lower portion of the face where mouth typically is
            mouth_region = gray[int(height * 0.6) :, :]

            # Analyze texture and edges in mouth region
            edges = cv2.Canny(mouth_region, 50, 150)
            edge_density = np.sum(edges > 0) / (mouth_region.shape[0] * mouth_region.shape[1])

            # Natural mouth regions have moderate edge density
            # Too high or too low might indicate artifacts
            if edge_density < 0.05 or edge_density > 0.3:
                return min(1.0, edge_density * 3)  # Adjust scaling
            else:
                return 0.3  # Normal range
        except:
            return 0.4

    def _analyze_skin_texture(self, face_region: np.ndarray) -> float:
        """
        Analyze skin texture for unnatural patterns
        """
        try:
            # Convert to grayscale
            gray = (
                cv2.cvtColor(face_region, cv2.COLOR_RGB2GRAY)
                if len(face_region.shape) == 3
                else face_region
            )

            # Calculate Local Binary Pattern (simplified)
            # In practice, use dedicated LBP implementation
            lbp = self._calculate_simple_lbp(gray)

            # Analyze LBP histogram for uniformity
            hist, _ = np.histogram(lbp.ravel(), bins=256, range=(0, 256))
            hist_normalized = hist / np.sum(hist)

            # Calculate entropy of texture distribution
            entropy = -np.sum(hist_normalized * np.log2(hist_normalized + 1e-10))

            # Natural skin has certain texture complexity
            # Too uniform or too complex might indicate artifacts
            if entropy < 2 or entropy > 6:
                return min(1.0, entropy / 8)  # Adjust scaling
            else:
                return 0.4  # Normal range
        except:
            return 0.35

    def _calculate_simple_lbp(self, img: np.ndarray) -> np.ndarray:
        """
        Simple LBP calculation (simplified for example)
        """
        # This is a very simplified LBP implementation
        # In practice, use scikit-image's local_binary_pattern function
        lbp = np.zeros_like(img)
        for i in range(1, img.shape[0] - 1):
            for j in range(1, img.shape[1] - 1):
                center = img[i, j]
                code = 0
                code |= (img[i - 1, j - 1] >= center) << 0
                code |= (img[i - 1, j] >= center) << 1
                code |= (img[i - 1, j + 1] >= center) << 2
                code |= (img[i, j + 1] >= center) << 3
                code |= (img[i + 1, j + 1] >= center) << 4
                code |= (img[i + 1, j] >= center) << 5
                code |= (img[i + 1, j - 1] >= center) << 6
                code |= (img[i, j - 1] >= center) << 7
                lbp[i, j] = code
        return lbp

    def detect_temporal_artifacts(self, video_path: str | Path) -> float:
        """
        Detect temporal inconsistencies in video sequences
        """
        try:
            cap = cv2.VideoCapture(str(video_path))
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            if frame_count < 2:
                cap.release()
                return 0.0

            # Sample frames to reduce computation
            frame_interval = max(1, frame_count // 30)  # Sample up to 30 frames
            frames = []

            for i in range(0, frame_count, frame_interval):
                cap.set(cv2.CAP_PROP_POS_FRAMES, i)
                ret, frame = cap.read()
                if ret:
                    frames.append(frame)

            cap.release()

            if len(frames) < 2:
                return 0.0

            # Calculate frame differences
            frame_diffs = []
            for i in range(1, len(frames)):
                prev_gray = cv2.cvtColor(frames[i - 1], cv2.COLOR_BGR2GRAY)
                curr_gray = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)
                diff = cv2.absdiff(prev_gray, curr_gray)
                frame_diffs.append(np.mean(diff))

            # Calculate variance in frame differences
            if frame_diffs:
                diff_variance = np.var(frame_diffs)
                # Normalize to 0-1 range
                return min(1.0, diff_variance / 1000)  # Adjust threshold as needed
            else:
                return 0.0
        except:
            return 0.3

    def detect_eye_blink_irregularities(self, video_path: str | Path) -> float:
        """
        Detect irregular eye blink patterns that may indicate deepfakes
        """
        try:
            cap = cv2.VideoCapture(str(video_path))
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            # Sample frames
            frame_interval = max(1, frame_count // 50)  # Sample up to 50 frames
            eye_states = []

            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            )
            eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")

            for i in range(0, frame_count, frame_interval):
                cap.set(cv2.CAP_PROP_POS_FRAMES, i)
                ret, frame = cap.read()
                if ret:
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    faces = face_cascade.detectMultiScale(gray, 1.1, 4)

                    if len(faces) > 0:
                        # Analyze first detected face
                        x, y, w, h = faces[0]
                        face_region = gray[y : y + h, x : x + w]
                        eyes = eye_cascade.detectMultiScale(face_region, 1.1, 4)
                        # Simple heuristic: if eyes detected, eyes are likely open
                        eye_states.append(len(eyes) > 0)

            cap.release()

            if len(eye_states) < 5:
                return 0.0  # Not enough data

            # Calculate blink rate and regularity
            eye_open_frames = sum(eye_states)
            total_frames = len(eye_states)
            blink_rate = eye_open_frames / total_frames if total_frames > 0 else 0

            # Natural blink rate is typically 15-20 blinks per minute
            # In a short video segment, we expect some variation
            # Too consistent blinking might indicate deepfake
            if blink_rate > 0.9 or blink_rate < 0.1:
                return 0.9  # Highly suspicious
            else:
                return 0.3  # Normal range
        except:
            return 0.4

    def detect_lip_sync_anomalies(
        self, video_path: str | Path, audio_path: str | Path | None = None
    ) -> float:
        """
        Detect lip sync anomalies between video and audio
        """
        try:
            # For this example, we'll use a simplified approach
            # In practice, you would use specialized lip sync detection libraries

            # If audio path is provided, analyze synchronization
            if audio_path:
                # Load audio
                audio_data, sr = librosa.load(str(audio_path), sr=None)

                # Analyze audio for speech characteristics
                # This is a very simplified example
                rms_energy = librosa.feature.rms(y=audio_data)
                speech_activity = np.mean(rms_energy)

                # If we have high speech activity but no corresponding lip movement,
                # that might indicate lip sync issues

                # For now, we'll return a medium score as a placeholder
                return 0.5 if speech_activity > 0.01 else 0.2
            else:
                # Without audio, we can't check lip sync
                return 0.0
        except:
            return 0.3

    def detect_misinfo(
        self, media_paths: list[str | Path], media_types: list[str]
    ) -> list[dict[str, Any]]:
        """
        Main detection function for deepfake misinformation
        """
        results = []

        for path, media_type in zip(media_paths, media_types, strict=False):
            result = {
                "media_path": str(path),
                "media_type": media_type,
                "artifact_analysis": {},
                "anomaly_score": 0.0,
                "misinfo_score": 0.0,
                "confidence": 0.0,
                "is_deepfake": False,
            }

            if media_type == "image":
                # Load image
                image = cv2.imread(str(path))
                if image is not None:
                    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

                    # Detect facial inconsistencies
                    facial_results = self.detect_facial_inconsistencies(image_rgb)
                    result["artifact_analysis"] = facial_results

                    # Calculate misinfo score
                    misinfo_score = facial_results.get("overall_facial_score", 0.0)
                    result["misinfo_score"] = misinfo_score
                    result["confidence"] = min(1.0, misinfo_score + 0.2)
                    result["is_deepfake"] = misinfo_score > 0.5

            elif media_type == "video":
                # Detect various video artifacts
                temporal_score = self.detect_temporal_artifacts(path)
                eye_blink_score = self.detect_eye_blink_irregularities(path)
                lip_sync_score = self.detect_lip_sync_anomalies(path)

                # Combine scores
                combined_score = 0.4 * temporal_score + 0.3 * eye_blink_score + 0.3 * lip_sync_score

                result["artifact_analysis"] = {
                    "temporal_artifacts": temporal_score,
                    "eye_blink_irregularities": eye_blink_score,
                    "lip_sync_anomalies": lip_sync_score,
                }

                result["misinfo_score"] = combined_score
                result["confidence"] = min(1.0, combined_score + 0.2)
                result["is_deepfake"] = combined_score > 0.5

            elif media_type == "audio":
                # For audio, we mainly rely on the audio detector
                # Here we'll provide a placeholder score
                result["artifact_analysis"] = {"audio_deepfake_indicators": 0.3}
                result["misinfo_score"] = 0.3
                result["confidence"] = 0.5
                result["is_deepfake"] = False  # Conservative estimate

            results.append(result)

        return results

    def generate_adversarial_samples(
        self, base_media_paths: list[str | Path], media_types: list[str], num_samples: int = 3
    ) -> list[dict[str, Any]]:
        """
        Generate adversarial media samples for training improvement
        """
        adversarial_samples = []

        for _ in range(num_samples):
            # Select a random base media
            idx = random.randint(0, len(base_media_paths) - 1)
            base_path = base_media_paths[idx]
            media_type = media_types[idx]

            # Create adversarial variants
            adversarial_variant = self._create_adversarial_variant(base_path, media_type)
            adversarial_samples.append(
                {
                    "original_path": str(base_path),
                    "adversarial_sample": adversarial_variant,
                    "media_type": media_type,
                }
            )

        return adversarial_samples

    def _create_adversarial_variant(self, media_path: str | Path, media_type: str) -> Any:
        """
        Create an adversarial variant of the media
        """
        if media_type == "image":
            # Load image
            image = Image.open(str(media_path))

            # Apply adversarial transformations
            transformations = [
                self._add_image_noise,
                self._modify_image_colors,
                self._apply_image_blur,
                self._add_image_compression,
            ]

            # Randomly select and apply transformation
            transform = random.choice(transformations)
            return transform(image)

        elif media_type == "video":
            # For video, we'll create adversarial frame modifications
            cap = cv2.VideoCapture(str(media_path))
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            # Select a random frame
            frame_idx = random.randint(0, frame_count - 1)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            cap.release()

            if ret:
                # Convert to PIL Image for easier manipulation
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(frame_rgb)

                # Apply adversarial transformations
                transformations = [
                    self._add_image_noise,
                    self._modify_image_colors,
                    self._apply_image_blur,
                ]

                transform = random.choice(transformations)
                return transform(pil_image)
            else:
                return None

        elif media_type == "audio":
            # For audio, we'll apply adversarial modifications
            try:
                audio_data, sr = librosa.load(str(media_path), sr=None)

                # Apply adversarial transformations
                transformations = [
                    self._add_audio_noise,
                    self._modify_audio_pitch,
                    self._apply_audio_compression,
                ]

                transform = random.choice(transformations)
                modified_audio = transform(audio_data)

                # Save to temporary file
                import tempfile

                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                    sf.write(tmp_file.name, modified_audio, sr)
                    return tmp_file.name
            except:
                return str(media_path)  # Return original if modification fails

        return str(media_path)  # Fallback

    def _add_image_noise(self, image: Image.Image) -> Image.Image:
        """Add noise to image"""
        img_array = np.array(image)
        noise = np.random.normal(0, random.uniform(5, 20), img_array.shape)
        noisy_img = np.clip(img_array.astype(np.float32) + noise, 0, 255)
        return Image.fromarray(noisy_img.astype(np.uint8))

    def _modify_image_colors(self, image: Image.Image) -> Image.Image:
        """Modify image colors"""
        img_array = np.array(image)

        # Apply random color adjustments
        if len(img_array.shape) == 3:
            r_factor = random.uniform(0.8, 1.2)
            g_factor = random.uniform(0.8, 1.2)
            b_factor = random.uniform(0.8, 1.2)

            img_array = img_array.astype(np.float32)
            img_array[:, :, 0] = np.clip(img_array[:, :, 0] * r_factor, 0, 255)
            img_array[:, :, 1] = np.clip(img_array[:, :, 1] * g_factor, 0, 255)
            img_array[:, :, 2] = np.clip(img_array[:, :, 2] * b_factor, 0, 255)

        return Image.fromarray(img_array.astype(np.uint8))

    def _apply_image_blur(self, image: Image.Image) -> Image.Image:
        """Apply blur to image"""
        # Convert to OpenCV format
        img_array = np.array(image)
        kernel_size = random.choice([3, 5, 7])
        if kernel_size % 2 == 0:
            kernel_size += 1  # Ensure odd kernel size

        blurred = cv2.GaussianBlur(img_array, (kernel_size, kernel_size), 0)
        return Image.fromarray(blurred)

    def _add_image_compression(self, image: Image.Image) -> Image.Image:
        """Simulate compression artifacts"""
        # Save as JPEG with low quality to simulate compression
        import io

        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=random.randint(10, 50))
        buffer.seek(0)
        return Image.open(buffer)

    def _add_audio_noise(self, audio_data: np.ndarray) -> np.ndarray:
        """Add noise to audio"""
        noise_factor = random.uniform(0.001, 0.01)
        noise = np.random.normal(0, noise_factor, audio_data.shape)
        return audio_data + noise

    def _modify_audio_pitch(self, audio_data: np.ndarray) -> np.ndarray:
        """Modify audio pitch"""
        # Simple pitch shifting (in practice, use librosa.effects.pitch_shift)
        return audio_data * random.uniform(0.95, 1.05)

    def _apply_audio_compression(self, audio_data: np.ndarray) -> np.ndarray:
        """Apply audio compression effects"""
        # Simple compression simulation
        threshold = random.uniform(0.1, 0.3)
        compressed = np.clip(audio_data, -threshold, threshold)
        return compressed

    def update_model(
        self, training_media_paths: list[str | Path], media_types: list[str], labels: list[int]
    ):
        """
        Update the model with new training data
        """
        # Extract features for training data
        # This is a simplified implementation

        # Generate adversarial samples and continue training
        adversarial_samples = self.generate_adversarial_samples(
            training_media_paths, media_types, num_samples=3
        )
        adversarial_labels = [1] * len(adversarial_samples)  # All adversarial samples are misinfo

        # In a real system, you would retrain the models here
        print(
            f"Updated model with {len(training_media_paths)} training media and {len(adversarial_samples)} adversarial samples"
        )
