"""
Audio Detection Module for Adversarial Misinformation Defense Platform

This module implements detection of adversarial audio-based misinformation,
including deepfake audio detection and adversarial sample generation.
"""

import random
from pathlib import Path
from typing import Any

import librosa
import numpy as np
import torch.nn as nn
from scipy import signal
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


class AdversarialAudioGAN(nn.Module):
    """
    Simple GAN for generating adversarial audio samples for training
    """

    def __init__(self, input_dim: int = 1024, hidden_dim: int = 512):
        super(AdversarialAudioGAN, self).__init__()

        # Generator
        self.generator = nn.Sequential(
            nn.Linear(100, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, input_dim),
            nn.Tanh(),
        )

        # Discriminator
        self.discriminator = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, hidden_dim),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        generated = self.generator(x)
        return self.discriminator(generated)


class AudioDetector:
    """
    Detection module for audio-based misinformation and deepfakes
    """

    def __init__(self):
        """
        Initialize the audio detector with default models
        """
        # Initialize isolation forest for anomaly detection
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()

        # Initialize adversarial GAN
        self.adversarial_gan = AdversarialAudioGAN()

        # Common audio artifacts and patterns for deepfake detection
        self.artifact_patterns = {
            "spectral_anomalies": 0.8,
            "inconsistent_fundamental_freq": 0.7,
            "harmonic_distortions": 0.75,
            "compression_artifacts": 0.6,
            "synthesis_artifacts": 0.85,
        }

    def extract_features(self, audio_data: np.ndarray, sr: int = 22050) -> dict[str, Any]:
        """
        Extract features from audio for analysis
        """
        features = {}

        # Basic signal properties
        features["duration"] = len(audio_data) / sr
        features["rms_energy"] = np.sqrt(np.mean(audio_data**2))
        features["zero_crossing_rate"] = np.mean(librosa.feature.zero_crossing_rate(audio_data))

        # Spectral features
        try:
            stft = np.abs(librosa.stft(audio_data))
            features["spectral_centroid"] = np.mean(librosa.feature.spectral_centroid(S=stft))
            features["spectral_rolloff"] = np.mean(librosa.feature.spectral_rolloff(S=stft))
            features["spectral_bandwidth"] = np.mean(librosa.feature.spectral_bandwidth(S=stft))
        except:
            features["spectral_centroid"] = 0
            features["spectral_rolloff"] = 0
            features["spectral_bandwidth"] = 0

        # MFCC features
        try:
            mfccs = librosa.feature.mfcc(y=audio_data, sr=sr, n_mfcc=13)
            features["mfcc_mean"] = np.mean(mfccs, axis=1).tolist()
            features["mfcc_std"] = np.std(mfccs, axis=1).tolist()
        except:
            features["mfcc_mean"] = [0] * 13
            features["mfcc_std"] = [0] * 13

        # Fundamental frequency (pitch) features
        try:
            pitches, magnitudes = librosa.piptrack(y=audio_data, sr=sr)
            pitch_values = pitches[magnitudes > np.median(magnitudes)]
            pitch_values = pitch_values[pitch_values > 0]  # Remove zero values

            if len(pitch_values) > 0:
                features["pitch_mean"] = np.mean(pitch_values)
                features["pitch_std"] = np.std(pitch_values)
                features["pitch_median"] = np.median(pitch_values)
            else:
                features["pitch_mean"] = 0
                features["pitch_std"] = 0
                features["pitch_median"] = 0
        except:
            features["pitch_mean"] = 0
            features["pitch_std"] = 0
            features["pitch_median"] = 0

        # Harmonic features
        try:
            harmonics, percussive = librosa.effects.hpss(audio_data)
            features["harmonic_energy"] = np.sqrt(np.mean(harmonics**2))
            features["percussive_energy"] = np.sqrt(np.mean(percussive**2))
            features["harmonic_ratio"] = features["harmonic_energy"] / (
                features["percussive_energy"] + 1e-6
            )
        except:
            features["harmonic_energy"] = 0
            features["percussive_energy"] = 0
            features["harmonic_ratio"] = 0

        return features

    def detect_audio_artifacts(self, audio_data: np.ndarray, sr: int = 22050) -> dict[str, float]:
        """
        Detect specific audio artifacts that may indicate manipulation or synthesis
        """
        results = {}

        # Check for spectral anomalies (common in synthesized audio)
        results["spectral_anomalies"] = self._detect_spectral_anomalies(audio_data, sr)

        # Check for inconsistent fundamental frequencies
        results["inconsistent_fundamental_freq"] = self._detect_inconsistent_f0(audio_data, sr)

        # Check for harmonic distortions
        results["harmonic_distortions"] = self._detect_harmonic_distortions(audio_data, sr)

        # Check for compression artifacts
        results["compression_artifacts"] = self._detect_compression_artifacts(audio_data, sr)

        # Check for synthesis artifacts
        results["synthesis_artifacts"] = self._detect_synthesis_artifacts(audio_data, sr)

        # Overall deepfake audio score based on combined artifacts
        scores = list(results.values())
        if scores:
            results["overall_deepfake_audio_score"] = np.mean(scores)
        else:
            results["overall_deepfake_audio_score"] = 0.0

        return results

    def _detect_spectral_anomalies(self, audio_data: np.ndarray, sr: int) -> float:
        """
        Detect spectral anomalies that may indicate synthesis
        """
        try:
            # Compute spectrogram
            frequencies, times, Sxx = signal.spectrogram(audio_data, fs=sr)

            # Calculate spectral flatness (a measure of noisiness)
            geometric_mean = np.exp(np.mean(np.log(Sxx + 1e-10), axis=0))
            arithmetic_mean = np.mean(Sxx, axis=0)
            spectral_flatness = np.mean(geometric_mean / (arithmetic_mean + 1e-10))

            # Low spectral flatness indicates tonal content (natural speech)
            # High spectral flatness indicates noise (potential synthesis artifacts)
            return min(1.0, max(0.0, spectral_flatness * 2))  # Adjust based on expected range
        except:
            return 0.3

    def _detect_inconsistent_f0(self, audio_data: np.ndarray, sr: int) -> float:
        """
        Detect inconsistent fundamental frequency patterns
        """
        try:
            # Extract pitch track
            pitches, magnitudes = librosa.piptrack(y=audio_data, sr=sr)

            # Select pitches with significant magnitude
            pitch_values = []
            for t in range(pitches.shape[1]):
                index = magnitudes[:, t].argmax()
                pitch = pitches[index, t]
                if pitch > 0:  # Only consider non-zero pitches
                    pitch_values.append(pitch)

            if len(pitch_values) < 2:
                return 0.0

            # Calculate pitch variability (natural speech has certain patterns)
            pitch_variability = np.std(pitch_values)
            pitch_mean = np.mean(pitch_values)

            # Abnormal variability might indicate synthesis
            if pitch_mean > 0:
                relative_variability = pitch_variability / pitch_mean
                # Natural speech typically has relative variability between 0.1-0.5
                if relative_variability < 0.1 or relative_variability > 0.8:
                    return min(1.0, relative_variability)
                else:
                    return 0.3  # Normal range
            else:
                return 0.5
        except:
            return 0.4

    def _detect_harmonic_distortions(self, audio_data: np.ndarray, sr: int) -> float:
        """
        Detect harmonic distortions
        """
        try:
            # Use harmonic-percussive source separation
            harmonic, percussive = librosa.effects.hpss(audio_data)

            # Calculate harmonic-to-percussive ratio
            h_power = np.sum(harmonic**2)
            p_power = np.sum(percussive**2)

            if p_power > 0:
                h_to_p_ratio = h_power / p_power
            else:
                h_to_p_ratio = 1.0

            # Very high or very low ratios might indicate artifacts
            if h_to_p_ratio < 0.1 or h_to_p_ratio > 10:
                return min(1.0, max(0.0, abs(np.log10(h_to_p_ratio)) / 2))
            else:
                return 0.2
        except:
            return 0.3

    def _detect_compression_artifacts(self, audio_data: np.ndarray, sr: int) -> float:
        """
        Detect compression artifacts (like those found in MP3)
        """
        try:
            # Analyze frequency spectrum for characteristic artifacts
            # Look for discontinuities, unnatural patterns
            frequencies, times, Sxx = signal.spectrogram(audio_data, fs=sr)

            # Calculate spectral flux (rate of change in spectrum)
            spectral_flux = np.sum(np.diff(Sxx, axis=1) ** 2, axis=0)
            mean_flux = np.mean(spectral_flux)

            # Very high or very low spectral flux might indicate compression
            if mean_flux < 0.01 or mean_flux > 10:
                return min(1.0, mean_flux / 10)
            else:
                return 0.2
        except:
            return 0.25

    def _detect_synthesis_artifacts(self, audio_data: np.ndarray, sr: int) -> float:
        """
        Detect synthesis-specific artifacts
        """
        try:
            # Calculate zero-crossing rate variability (synthetic audio often has unnatural patterns)
            frame_length = 2048
            hop_length = 512
            zcr_frames = librosa.feature.zero_crossing_rate(
                audio_data, frame_length=frame_length, hop_length=hop_length
            )

            zcr_variability = np.std(zcr_frames)

            # Natural speech has certain zero-crossing patterns
            if zcr_variability < 0.001 or zcr_variability > 0.05:
                return min(1.0, max(0.0, zcr_variability * 20))
            else:
                return 0.3
        except:
            return 0.35

    def detect_misinfo(self, audio_paths: list[str | Path]) -> list[dict[str, Any]]:
        """
        Main detection function for audio misinformation
        """
        results = []

        for path in audio_paths:
            # Load audio
            audio_data, sr = librosa.load(str(path), sr=None)

            # Extract features
            features = self.extract_features(audio_data, sr)

            # Detect artifacts
            artifact_results = self.detect_audio_artifacts(audio_data, sr)

            # Check for anomalies using isolation forest
            # Prepare feature vector for anomaly detection
            flat_features = self._flatten_features(features)
            try:
                # Normalize features
                normalized_features = self.scaler.fit_transform([flat_features])
                is_anomaly = (
                    self.anomaly_detector.fit(normalized_features).predict(normalized_features)[0]
                    == -1
                )
                anomaly_score = 1.0 if is_anomaly else 0.0
            except:
                anomaly_score = 0.0

            # Calculate overall misinfo score
            deepfake_score = artifact_results.get("overall_deepfake_audio_score", 0.0)
            combined_score = 0.7 * deepfake_score + 0.3 * anomaly_score

            result = {
                "audio_path": str(path),
                "features": features,
                "artifact_analysis": artifact_results,
                "anomaly_score": anomaly_score,
                "misinfo_score": combined_score,
                "confidence": min(1.0, combined_score + 0.2),  # Base confidence
                "is_deepfake_audio": deepfake_score > 0.5,
            }

            results.append(result)

        return results

    def _flatten_features(self, features: dict) -> np.ndarray:
        """
        Flatten features dict into a 1D numpy array for ML models
        """
        flat = []
        for key, value in features.items():
            if isinstance(value, (int, float)):
                flat.append(value)
            elif isinstance(value, list):
                flat.extend(value)
            elif isinstance(value, np.ndarray):
                flat.extend(value.flatten().tolist())
        return np.array(flat)

    def generate_adversarial_samples(
        self, base_audio_paths: list[str | Path], num_samples: int = 3
    ) -> list[np.ndarray]:
        """
        Generate adversarial audio samples for training improvement
        """
        adversarial_audios = []

        for _ in range(num_samples):
            # Load a random base audio
            base_path = random.choice(base_audio_paths)
            base_audio, sr = librosa.load(str(base_path), sr=None)

            # Create adversarial variants
            adversarial_variants = [
                self._add_noise(base_audio),
                self._modify_pitch(base_audio),
                self._add_compression_effects(base_audio, sr),
                self._apply_time_stretching(base_audio),
                self._apply_frequency_masking(base_audio),
            ]

            # Randomly select one variant
            selected_variant = random.choice(adversarial_variants)
            adversarial_audios.append(selected_variant)

        return adversarial_audios

    def _add_noise(self, audio_data: np.ndarray) -> np.ndarray:
        """Add random noise to audio"""
        noise_factor = random.uniform(0.005, 0.05)  # Small noise to avoid distortion
        noise = np.random.normal(0, noise_factor, audio_data.shape)
        return audio_data + noise

    def _modify_pitch(self, audio_data: np.ndarray) -> np.ndarray:
        """Randomly modify pitch and formants"""
        n_steps = random.uniform(-2, 2)  # Small pitch shift
        return librosa.effects.pitch_shift(audio_data, sr=22050, n_steps=n_steps)

    def _add_compression_effects(self, audio_data: np.ndarray, sr: int) -> np.ndarray:
        """Simulate compression artifacts"""
        # Apply dynamic range compression
        threshold = random.uniform(0.1, 0.5)
        compressed = np.clip(audio_data, -threshold, threshold)
        return compressed

    def _apply_time_stretching(self, audio_data: np.ndarray) -> np.ndarray:
        """Apply time stretching without pitch change"""
        rate = random.uniform(0.9, 1.1)  # Small rate variation
        stretched = librosa.effects.time_stretch(audio_data, rate=rate)
        # Trim or pad to original length
        if len(stretched) > len(audio_data):
            stretched = stretched[: len(audio_data)]
        elif len(stretched) < len(audio_data):
            # Pad with zeros
            pad_width = len(audio_data) - len(stretched)
            stretched = np.pad(stretched, (0, pad_width), mode="constant")
        return stretched

    def _apply_frequency_masking(self, audio_data: np.ndarray) -> np.ndarray:
        """Apply random frequency masking"""
        # Create random frequency mask
        D = 128  # number of mel bands for this example
        F = random.randint(5, 20)  # frequency mask parameter
        num_mel = random.randint(1, 3)  # number of masked areas

        # Compute mel spectrogram
        mel_spec = librosa.feature.melspectrogram(y=audio_data)

        # Apply random masks
        for _ in range(num_mel):
            f = random.randint(0, F)
            f0 = random.randint(0, D - f)
            mel_spec[f0 : f0 + f, :] = 0

        # Invert mel spectrogram back to audio (this is simplified)
        # In practice, you'd use griffin-lim or other methods
        return audio_data  # Placeholder - return original for now

    def update_model(self, training_audio_paths: list[str | Path], labels: list[int]):
        """
        Update the model with new training data
        """
        # Extract features for all training audio
        all_features = []
        for path in training_audio_paths:
            audio_data, sr = librosa.load(str(path), sr=None)
            features = self.extract_features(audio_data, sr)
            flat_features = self._flatten_features(features)
            all_features.append(flat_features)

        # Fit anomaly detector on features
        if all_features:
            all_features_array = np.array(all_features)
            normalized_features = self.scaler.fit_transform(all_features_array)
            self.anomaly_detector.fit(normalized_features)

        # Generate adversarial samples and continue training
        adversarial_audios = self.generate_adversarial_samples(training_audio_paths, num_samples=3)
        adversarial_labels = [1] * len(adversarial_audios)  # All adversarial audio are misinfo

        # In a real system, you would retrain the models here
        print(
            f"Updated model with {len(training_audio_paths)} training audio and {len(adversarial_audios)} adversarial samples"
        )
