"""
Image Detection Module for Adversarial Misinformation Defense Platform

This module implements detection of adversarial image-based misinformation,
including deepfake detection, metadata analysis, and adversarial sample generation.
"""

import random
from io import BytesIO
from typing import Any

import cv2
import numpy as np
import requests
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
from sklearn.ensemble import IsolationForest
from tensorflow.keras.applications import VGG16
from tensorflow.keras.applications.vgg16 import preprocess_input
from tensorflow.keras.models import Model


class AdversarialImageGAN(nn.Module):
    """
    Simple GAN for generating adversarial image samples for training
    """

    def __init__(self, img_channels: int = 3, img_size: int = 64):
        super(AdversarialImageGAN, self).__init__()

        self.img_size = img_size
        self.img_channels = img_channels

        # Generator
        self.generator = nn.Sequential(
            nn.Linear(100, 128),
            nn.LeakyReLU(0.2),
            nn.Linear(128, 256),
            nn.BatchNorm1d(256),
            nn.LeakyReLU(0.2),
            nn.Linear(256, 512),
            nn.BatchNorm1d(512),
            nn.LeakyReLU(0.2),
            nn.Linear(512, img_channels * img_size * img_size),
            nn.Tanh(),
        )

        # Discriminator
        self.discriminator = nn.Sequential(
            nn.Linear(img_channels * img_size * img_size, 512),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            nn.Linear(256, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        generated = self.generator(x)
        return self.discriminator(generated)


class ImageDetector:
    """
    Detection module for image-based misinformation and deepfakes
    """

    def __init__(self):
        """
        Initialize the image detector with pre-trained models
        """
        self.preprocess = transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )

        # Load pre-trained VGG16 for feature extraction
        base_model = VGG16(weights="imagenet")
        self.feature_extractor = Model(
            inputs=base_model.input, outputs=base_model.get_layer("fc1").output
        )

        # Initialize isolation forest for anomaly detection
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)

        # Initialize adversarial GAN
        self.adversarial_gan = AdversarialImageGAN()

        # Common artifacts and patterns for deepfake detection
        self.artifact_patterns = {
            "jpeg_compression": 0.8,
            "inconsistent_lighting": 0.7,
            "edge_discontinuities": 0.9,
            "face_boundary_artifacts": 0.75,
            "inconsistent_shadows": 0.6,
        }

    def load_image_from_url(self, url: str) -> Image.Image:
        """
        Load image from URL
        """
        response = requests.get(url)
        img = Image.open(BytesIO(response.content))
        return img

    def extract_features(self, image: Image.Image) -> np.ndarray:
        """
        Extract features from image for analysis
        """
        # Convert to array and preprocess for VGG
        img_array = np.array(image.resize((224, 224)))
        if len(img_array.shape) == 2:  # Grayscale
            img_array = np.stack([img_array] * 3, axis=-1)
        elif img_array.shape[2] == 1:  # Single channel
            img_array = np.concatenate([img_array] * 3, axis=-1)
        elif img_array.shape[2] == 4:  # RGBA
            img_array = img_array[:, :, :3]  # Take RGB only

        # Preprocess for VGG
        img_array = preprocess_input(np.expand_dims(img_array, axis=0))

        # Extract features
        features = self.feature_extractor.predict(img_array, verbose=0)
        return features.flatten()

    def detect_deepfake_artifacts(self, image: Image.Image) -> dict[str, float]:
        """
        Detect specific deepfake artifacts in the image
        """
        img_array = np.array(image)
        results = {}

        # Check for JPEG compression artifacts
        if hasattr(image, "format") and image.format == "JPEG":
            results["jpeg_artifacts"] = self._detect_jpeg_artifacts(img_array)

        # Check for edge discontinuities (common in face swaps)
        results["edge_discontinuities"] = self._detect_edge_artifacts(img_array)

        # Check for inconsistent lighting
        results["inconsistent_lighting"] = self._detect_lighting_inconsistencies(img_array)

        # Check for face boundary artifacts
        if self._is_face_present(img_array):
            results["face_boundary_artifacts"] = self._detect_face_boundary_artifacts(img_array)

        # Overall deepfake score based on combined artifacts
        scores = list(results.values())
        if scores:
            results["overall_deepfake_score"] = np.mean(scores)
        else:
            results["overall_deepfake_score"] = 0.0

        return results

    def _detect_jpeg_artifacts(self, img_array: np.ndarray) -> float:
        """
        Detect JPEG compression artifacts
        """
        # Simple implementation: check for blocky patterns
        # In practice, use more sophisticated methods
        try:
            gray = (
                cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
                if len(img_array.shape) == 3
                else img_array
            )
            # Calculate variance of Laplacian (blur detection)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            # Lower variance indicates more blur (potential compression)
            return min(1.0, max(0.0, 1 - laplacian_var / 1000))
        except:
            return 0.5

    def _detect_edge_artifacts(self, img_array: np.ndarray) -> float:
        """
        Detect edge discontinuities which are common in deepfakes
        """
        try:
            gray = (
                cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
                if len(img_array.shape) == 3
                else img_array
            )

            # Detect edges
            edges = cv2.Canny(gray, 50, 150)

            # Look for unusual patterns in edges that might indicate compositing
            # Count edge pixels and compare with expected distribution
            edge_count = np.sum(edges > 0)
            total_pixels = gray.shape[0] * gray.shape[1]
            edge_density = edge_count / total_pixels

            # Unusually high edge density might indicate artifacts
            if edge_density > 0.3:
                return 0.8
            elif edge_density > 0.15:
                return 0.5
            else:
                return 0.2
        except:
            return 0.3

    def _detect_lighting_inconsistencies(self, img_array: np.ndarray) -> float:
        """
        Detect lighting inconsistencies that may indicate compositing
        """
        try:
            # Convert to HSV to analyze lighting (V channel)
            hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
            v_channel = hsv[:, :, 2]

            # Calculate local standard deviation of brightness
            kernel = np.ones((5, 5), np.float32) / 25
            smoothed_v = cv2.filter2D(v_channel, -1, kernel)
            local_std = np.sqrt(cv2.filter2D((v_channel - smoothed_v) ** 2, -1, kernel))

            # High local variance might indicate inconsistent lighting
            std_mean = np.mean(local_std)
            return min(1.0, std_mean / 50)  # Adjust threshold as needed
        except:
            return 0.4

    def _detect_face_boundary_artifacts(self, img_array: np.ndarray) -> float:
        """
        Detect artifacts around face boundaries (common in face swaps)
        """
        try:
            # Use Haar cascades to detect faces
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            )
            gray = (
                cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
                if len(img_array.shape) == 3
                else img_array
            )
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)

            if len(faces) == 0:
                return 0.0

            total_artifact_score = 0
            for x, y, w, h in faces:
                # Extract face region with some margin
                margin = min(w, h) // 4
                x1 = max(0, x - margin)
                y1 = max(0, y - margin)
                x2 = min(img_array.shape[1], x + w + margin)
                y2 = min(img_array.shape[0], y + h + margin)

                face_region = img_array[y1:y2, x1:x2]

                # Check for blending artifacts around face boundary
                face_boundary = img_array[y : y + h, x : x + w]

                # Compare statistics inside and outside face boundary
                if y > 0 and y + h < img_array.shape[0] and x > 0 and x + w < img_array.shape[1]:
                    top_region = img_array[y - 2 : y, x : x + w]
                    bottom_region = img_array[y + h : y + h + 2, x : x + w]
                    left_region = img_array[y : y + h, x - 2 : x]
                    right_region = img_array[y : y + h, x + w : x + w + 2]

                    # Calculate statistics for boundary regions
                    face_stats = np.mean(face_boundary, axis=(0, 1))
                    surrounding_stats = []

                    if top_region.size > 0:
                        surrounding_stats.append(np.mean(top_region, axis=(0, 1)))
                    if bottom_region.size > 0:
                        surrounding_stats.append(np.mean(bottom_region, axis=(0, 1)))
                    if left_region.size > 0:
                        surrounding_stats.append(np.mean(left_region, axis=(0, 1)))
                    if right_region.size > 0:
                        surrounding_stats.append(np.mean(right_region, axis=(0, 1)))

                    if surrounding_stats:
                        surrounding_mean = np.mean(surrounding_stats, axis=0)
                        # Difference in statistics might indicate artifacts
                        color_diff = np.mean(np.abs(face_stats - surrounding_mean))
                        total_artifact_score += min(1.0, color_diff / 50)  # Adjust threshold

            return total_artifact_score / max(1, len(faces))
        except:
            return 0.3

    def _is_face_present(self, img_array: np.ndarray) -> bool:
        """
        Check if a face is present in the image
        """
        try:
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            )
            gray = (
                cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
                if len(img_array.shape) == 3
                else img_array
            )
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            return len(faces) > 0
        except:
            return False

    def detect_misinfo(self, images: list[Image.Image]) -> list[dict[str, Any]]:
        """
        Main detection function for image misinformation
        """
        results = []

        for img in images:
            # Extract features
            features = self.extract_features(img)

            # Detect deepfake artifacts
            artifact_results = self.detect_deepfake_artifacts(img)

            # Check for anomalies using isolation forest
            try:
                is_anomaly = self.anomaly_detector.fit([features]).predict([features])[0] == -1
                anomaly_score = 1.0 if is_anomaly else 0.0
            except:
                anomaly_score = 0.0

            # Calculate overall misinfo score
            deepfake_score = artifact_results.get("overall_deepfake_score", 0.0)
            combined_score = 0.7 * deepfake_score + 0.3 * anomaly_score

            result = {
                "features": features.tolist(),
                "artifact_analysis": artifact_results,
                "anomaly_score": anomaly_score,
                "misinfo_score": combined_score,
                "confidence": min(1.0, combined_score + 0.2),  # Base confidence
                "is_deepfake": deepfake_score > 0.5,
            }

            results.append(result)

        return results

    def generate_adversarial_samples(
        self, base_images: list[Image.Image], num_samples: int = 5
    ) -> list[Image.Image]:
        """
        Generate adversarial image samples for training improvement
        """
        adversarial_images = []

        for _ in range(num_samples):
            # Apply random transformations to create adversarial variants
            base_img = random.choice(base_images)
            base_array = np.array(base_img)

            # Create adversarial variants
            adversarial_variants = [
                self._add_noise(base_array),
                self._modify_colors(base_array),
                self._add_compression_artifacts(base_array),
                self._create_edge_effects(base_array),
                self._add_geometric_distortions(base_array),
            ]

            # Randomly select one variant
            selected_variant = random.choice(adversarial_variants)
            adversarial_images.append(Image.fromarray(selected_variant))

        return adversarial_images

    def _add_noise(self, img_array: np.ndarray) -> np.ndarray:
        """Add random noise to image"""
        noise = np.random.normal(0, 25, img_array.shape).astype(np.uint8)
        noisy_img = cv2.add(img_array, noise)
        return np.clip(noisy_img, 0, 255).astype(np.uint8)

    def _modify_colors(self, img_array: np.ndarray) -> np.ndarray:
        """Modify color channels to create artifacts"""
        # Randomly adjust color channels
        multiplier = np.random.uniform(0.8, 1.2, size=(1, 1, 3))
        modified_img = np.clip(img_array * multiplier, 0, 255).astype(np.uint8)

        # Add color shifts
        shift = np.random.uniform(-10, 10, size=(1, 1, 3))
        modified_img = np.clip(modified_img + shift, 0, 255).astype(np.uint8)

        return modified_img

    def _add_compression_artifacts(self, img_array: np.ndarray) -> np.ndarray:
        """Simulate compression artifacts"""
        # Convert to JPEG and back to simulate compression
        pil_img = Image.fromarray(img_array)
        buffer = BytesIO()
        pil_img.save(buffer, format="JPEG", quality=random.randint(20, 60))
        buffer.seek(0)
        decompressed_img = Image.open(buffer)
        return np.array(decompressed_img)

    def _create_edge_effects(self, img_array: np.ndarray) -> np.ndarray:
        """Create edge-related artifacts"""
        gray = (
            cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY) if len(img_array.shape) == 3 else img_array
        )

        # Apply edge detection and enhance edges
        edges = cv2.Canny(gray, 50, 150)
        edges_3channel = np.stack([edges] * 3, axis=-1) if len(img_array.shape) == 3 else edges

        # Blend original with edge artifacts
        alpha = random.uniform(0.1, 0.3)
        result = cv2.addWeighted(img_array, 1 - alpha, edges_3channel, alpha, 0)
        return np.clip(result, 0, 255).astype(np.uint8)

    def _add_geometric_distortions(self, img_array: np.ndarray) -> np.ndarray:
        """Add geometric distortions"""
        rows, cols = img_array.shape[:2]

        # Create random distortion
        map_x = np.zeros((rows, cols), np.float32)
        map_y = np.zeros((rows, cols), np.float32)

        for i in range(rows):
            for j in range(cols):
                map_x[i, j] = j + random.uniform(-2, 2)
                map_y[i, j] = i + random.uniform(-2, 2)

        # Apply distortion
        distorted = cv2.remap(img_array, map_x, map_y, interpolation=cv2.INTER_LINEAR)
        return np.clip(distorted, 0, 255).astype(np.uint8)

    def update_model(self, training_images: list[Image.Image], labels: list[int]):
        """
        Update the model with new training data
        """
        # Extract features for all training images
        features = []
        for img in training_images:
            features.append(self.extract_features(img))

        # Fit anomaly detector on features
        self.anomaly_detector.fit(features)

        # Generate adversarial samples and continue training
        adversarial_images = self.generate_adversarial_samples(training_images, num_samples=5)
        adversarial_labels = [1] * len(adversarial_images)  # All adversarial images are misinfo

        # In a real system, you would retrain the deep learning models here
        print(
            f"Updated model with {len(training_images)} training images and {len(adversarial_images)} adversarial samples"
        )
